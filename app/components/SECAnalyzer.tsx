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
  const [showCompanies, setShowCompanies] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mock marked functionality since it's not available
  const getRenderedMarkdown = (markdown: string): string => {
    if (!markdown) return '';
    // Simple markdown parsing for basic formatting
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/#{3}\s*(.*)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/#{2}\s*(.*)/g, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/#{1}\s*(.*)/g, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
  };

  useEffect(() => {
    // Mock API info
    setInfo({
      supported_companies: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'V', 'WMT', 'PG', 'HD', 'UNH', 'DIS', 'MA', 'CRM', 'NFLX', 'ADBE', 'PYPL'],
      filing_types: ['10-K', '10-Q', '8-K', 'DEF 14A'],
      time_period: '2020-2024'
    });
  }, []);

  const handleSubmit = async (e: any): Promise<void> => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');

    // Mock streaming response
    const mockResponse = `## Analysis of ${query}

      Based on the SEC filings analysis:

      **Key Findings:**
      - Revenue growth has been **strong** over the recent quarters
      - Operating margins have *improved* significantly
      - Cash flow remains robust

      **Financial Highlights:**
      - Q3 2024 revenue: $45.2B (+12% YoY)
      - Net income: $8.7B (+15% YoY)
      - Operating cash flow: $12.1B

      This analysis is based on the latest SEC 10-Q and 10-K filings.`;

    // Simulate streaming
    const words = mockResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (!loading) break;
      await new Promise(resolve => setTimeout(resolve, 50));
      setResponse(words.slice(0, i + 1).join(' '));
    }
    
    setLoading(false);
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
          <div className="p-5 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">💬 Ask a Question</h2>
          </div>
          
          <div className="p-5">
            <div className="flex space-x-3">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="E.g., 'What was Apple's revenue in Q1 2024?'"
                className="flex-1 p-4 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500 transition-all duration-200"
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
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
            <div className="border-t border-gray-200 bg-gray-50 text-gray-900 p-6">
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
                    className="prose prose-blue max-w-none text-gray-800 leading-relaxed"
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
          <div className="p-5 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">💡 Example Questions</h2>
          </div>
          <div className="p-5 grid gap-2">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-left p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
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
              className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors duration-200"
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
                      className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-center font-medium text-sm border border-blue-100"
                    >
                      {company}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-gray-600 pt-4 border-t border-gray-100">
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