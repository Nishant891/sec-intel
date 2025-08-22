'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ApiInfo {
  supported_companies: string[];
  filing_types: string[];
  time_period: string;
}

interface StreamData {
  content?: string;
  done?: boolean;
  error?: string;
}

export default function SECAnalyzer() {
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [info, setInfo] = useState<ApiInfo | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch API info on component mount
  useEffect(() => {
    fetchInfo();
  }, []);

  const fetchInfo = async (): Promise<void> => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/info`);
      const data: ApiInfo = await res.json();
      setInfo(data);
    } catch (error) {
      console.error('Failed to fetch API info:', error);
    }
  };

  // Enhanced function to render markdown text
  const renderMarkdown = (text: string): string => {
    if (!text) return '';
    
    let rendered = text;
    
    // Headers (must be at start of line)
    rendered = rendered.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>');
    rendered = rendered.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2 text-gray-800">$1</h2>');
    rendered = rendered.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2 text-gray-900">$1</h1>');
    
    // Bold (**text** or __text__)
    rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    rendered = rendered.replace(/__([^_]+)__/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    // Italic (*text* or _text_) - but not if surrounded by **
    rendered = rendered.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-gray-700">$1</em>');
    rendered = rendered.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic text-gray-700">$1</em>');
    
    // Code blocks (```code```)
    rendered = rendered.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-md my-2 overflow-x-auto"><code class="text-sm text-gray-800">$1</code></pre>');
    
    // Inline code (`code`)
    rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800">$1</code>');
    
    // Links [text](url)
    rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
    
    // Unordered lists (- item)
    rendered = rendered.replace(/^- (.+$)/gim, '<li class="ml-4 mb-1">• $1</li>');
    rendered = rendered.replace(/(<li class="ml-4 mb-1">[\s\S]*?<\/li>)/g, '<ul class="my-2">$1</ul>');
    
    // Ordered lists (1. item)
    rendered = rendered.replace(/^\d+\. (.+$)/gim, '<li class="ml-4 mb-1">$1</li>');
    rendered = rendered.replace(/(<li class="ml-4 mb-1">[\s\S]*?<\/li>)/g, '<ol class="my-2 list-decimal list-inside">$1</ol>');
    
    // Line breaks (preserve double newlines as paragraph breaks)
    rendered = rendered.replace(/\n\n/g, '</p><p class="mb-3 text-gray-700 leading-relaxed">');
    rendered = '<p class="mb-3 text-gray-700 leading-relaxed">' + rendered + '</p>';
    
    // Clean up empty paragraphs
    rendered = rendered.replace(/<p class="mb-3 text-gray-700 leading-relaxed"><\/p>/g, '');
    rendered = rendered.replace(/<p class="mb-3 text-gray-700 leading-relaxed">\s*<\/p>/g, '');
    
    // Handle blockquotes (> text)
    rendered = rendered.replace(/^> (.+$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 py-2 my-2 bg-gray-50 italic text-gray-600">$1</blockquote>');
    
    // Horizontal rules (--- or ***)
    rendered = rendered.replace(/^---$/gm, '<hr class="my-4 border-gray-300">');
    rendered = rendered.replace(/^\*\*\*$/gm, '<hr class="my-4 border-gray-300">');
    
    return rendered;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');

    // Close any existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ query }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is actually streaming
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Received chunk:', chunk);
          
          buffer += chunk;
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') {
                  console.log('Received [DONE] signal');
                  setLoading(false);
                  return;
                }
                
                const data: StreamData = JSON.parse(dataStr);
                console.log('Parsed data:', data);
                
                if (data.done) {
                  console.log('Received done signal');
                  setLoading(false);
                  return;
                }
                
                if (data.error) {
                  console.error('Stream error:', data.error);
                  setResponse(prev => prev + `\n\nError: ${data.error}`);
                  setLoading(false);
                  return;
                }
                
                if (data.content) {
                  setResponse(prev => prev + data.content);
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError, 'Raw line:', line);
              }
            } else if (line.trim() === '') {
              // Empty line, continue
              continue;
            } else if (line.startsWith('event:') || line.startsWith('id:') || line.startsWith('retry:')) {
              // SSE metadata, ignore
              continue;
            } else {
              console.log('Unhandled line:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error: any) {
      console.error('Streaming error:', error);
      if (error.name !== 'AbortError') {
        setResponse('Sorry, there was an error processing your request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries: string[] = [
    "What are JPMorgan's key financial highlights?",
    "Tell me about Meta's recent quarterly results",
    "Compare Apple's revenue growth over the last 3 quarters",
    "What are Microsoft's main business segments and their performance?",
    "Show me Google's recent acquisitions and strategic investments"
  ];

  const handleExampleClick = (example: string): void => {
    setQuery(example);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏛️ SEC Filing Analyzer
          </h1>
          <p className="text-gray-600">
            Get insights from SEC filings using AI-powered analysis
          </p>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">💬 Ask a Question</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex space-x-3">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me about any SEC filing data, e.g., 'What was Apple's revenue in Q1 2024?'"
                className="flex-1 p-3 text-gray-950 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder-gray-600"
                rows={2}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* Response */}
          {(response || loading) && (
            <div className="border-t bg-gray-50 p-4">
              {loading && !response && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Analyzing SEC filings...</span>
                </div>
              )}
              {response && (
                <div className="markdown-content">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(response) + (loading ? '<span class="animate-pulse bg-blue-500 text-white px-1 ml-1">▌</span>' : '')
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Example Queries */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">💡 Example Questions</h2>
          </div>
          <div className="p-4">
            <div className="grid gap-2">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="text-left p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors duration-200"
                  disabled={loading}
                >
                  <span className="text-blue-600 hover:text-blue-700 text-sm">{example}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Company Info Card */}
        {info && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">📊 Supported Companies</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {info.supported_companies.map((company) => (
                  <div 
                    key={company}
                    className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-center font-medium text-sm"
                  >
                    {company}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-600">
                <span className="font-semibold">Filing Types:</span> {info.filing_types.join(', ')} | 
                <span className="font-semibold"> Time Period:</span> {info.time_period}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-xs">
          <p>SEC Filing Analyzer • Built with Next.js and Flask • Data from SEC EDGAR database</p>
        </div>
      </div>
    </div>
  );
}