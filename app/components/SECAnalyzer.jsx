'use client';

import { useState, useRef, useEffect } from 'react';

export default function SECAnalyzer() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const eventSourceRef = useRef(null);

  // Fetch API info on component mount
  useEffect(() => {
    fetchInfo();
  }, []);

  const fetchInfo = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/info`);
      const data = await res.json();
      setInfo(data);
    } catch (error) {
      console.error('Failed to fetch API info:', error);
    }
  };

  // Enhanced function to render markdown text
  const renderMarkdown = (text) => {
    if (!text) return '';
    
    let rendered = text;
    
    // Headers (must be at start of line)
    rendered = rendered.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    rendered = rendered.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    rendered = rendered.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold (**text** or __text__)
    rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    rendered = rendered.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_) - but not if surrounded by **
    rendered = rendered.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    rendered = rendered.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
    
    // Code blocks (```code```)
    rendered = rendered.replace(/```([^`]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code (`code`)
    rendered = rendered.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links [text](url)
    rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Unordered lists (- item)
    rendered = rendered.replace(/^- (.+$)/gim, '<li>$1</li>');
    rendered = rendered.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Ordered lists (1. item)
    rendered = rendered.replace(/^\d+\. (.+$)/gim, '<li>$1</li>');
    
    // Line breaks (preserve double newlines as paragraph breaks)
    rendered = rendered.replace(/\n\n/g, '</p><p>');
    rendered = '<p>' + rendered + '</p>';
    
    // Clean up empty paragraphs
    rendered = rendered.replace(/<p><\/p>/g, '');
    rendered = rendered.replace(/<p>\s*<\/p>/g, '');
    
    // Handle blockquotes (> text)
    rendered = rendered.replace(/^> (.+$)/gim, '<blockquote>$1</blockquote>');
    
    // Horizontal rules (--- or ***)
    rendered = rendered.replace(/^---$/gm, '<hr>');
    rendered = rendered.replace(/^\*\*\*$/gm, '<hr>');
    
    return rendered;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');

    // Close any existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.done) {
                setLoading(false);
                break;
              }
              
              if (data.content) {
                setResponse(prev => prev + data.content);
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setResponse('Sorry, there was an error processing your request. Please try again.');
      setLoading(false);
    }
  };

  const exampleQueries = [
    "What was Apple's revenue in 2024?",
    "What are JPMorgan's key financial highlights?",
    "Tell me about Meta's recent quarterly results"
  ];

  const handleExampleClick = (example) => {
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
                rows="2"
                disabled={loading}
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
                  <img src="/send.svg" alt="Send" className="w-4 h-4" />
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
                      __html: renderMarkdown(response) + (loading ? '<span class="animate-pulse">▌</span>' : '')
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