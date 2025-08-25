'use client';

import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

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
  const [showCompanies, setShowCompanies] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

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

  const getRenderedMarkdown = (markdown: string): string => {
    if (!markdown) return '';
    return marked.parse(markdown) as string;
  };

  const handleSubmit = async (e: any): Promise<void> => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');

    if (eventSourceRef.current) eventSourceRef.current.close();
    if (abortControllerRef.current) abortControllerRef.current.abort();

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

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') {
                  setLoading(false);
                  return;
                }

                const data: StreamData = JSON.parse(dataStr);
                if (data.done) {
                  setLoading(false);
                  return;
                }
                if (data.error) {
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏛️ SEC Filing Analyzer
          </h1>
          <p className="text-gray-600 text-lg">
            Get AI-powered insights from SEC filings in seconds
          </p>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="p-5 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">💬 Ask a Question</h2>
          </div>
          
          <div className="p-5">
            <div className="flex space-x-3">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="E.g., 'What was Apple's revenue in Q1 2024?'"
                className="flex-1 p-4 text-gray-900 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none placeholder-gray-500"
                rows={2}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span>Send</span>
                )}
              </button>
            </div>
          </div>

          {/* Response */}
          {(response || loading) && (
            <div className="bg-gray-50 text-gray-900 p-6">
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
                <div className="bg-white p-6 rounded-lg border border-gray-200 min-h-[400px]">
                  <div
                    className="prose prose-blue max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: getRenderedMarkdown(response) + (loading ? '<span class="animate-pulse text-blue-500 ml-1">▌</span>' : '')
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Example Queries */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="p-5 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">💡 Example Questions</h2>
          </div>
          <div className="p-5 grid gap-2">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-left p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors duration-200 text-sm"
                disabled={loading}
              >
                <span className="text-blue-700">{example}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Company Info Card */}
        {info && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="p-5 bg-gray-50 flex justify-between items-center cursor-pointer"
              onClick={() => setShowCompanies(!showCompanies)}
            >
              <h2 className="text-lg font-semibold text-gray-800">📊 Supported Companies</h2>
              <span className="text-sm text-blue-600">{showCompanies ? "Hide" : "Show"}</span>
            </div>
            {showCompanies && (
              <div className="p-5">
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
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-10 text-gray-500 text-sm">
          <p>Made with ❤️ by Nishant</p>
        </div>
      </div>
    </div>
  );
}