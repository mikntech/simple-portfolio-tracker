import { useState, useEffect } from 'react';
import { PortfolioDashboard } from '../components/PortfolioDashboard';
import { TransactionForm } from '../components/TransactionForm';
import { CSVUpload } from '../components/CSVUpload';
import { TransactionList } from '../components/TransactionList';
import { AllocationManager } from '../components/AllocationManager';
import { usePortfolios } from '../hooks/usePortfolios';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'allocations'>(
    'dashboard'
  );

  const { user, signOut } = useAuth();
  const { data: portfolios = [], isLoading } = usePortfolios(user?.userId);

  // Auto-select first portfolio if available
  useEffect(() => {
    if (portfolios.length > 0 && !selectedPortfolioId) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Tracker</h1>

            <div className="flex items-center gap-4">
              {/* Portfolio Selector */}
              {portfolios.length > 0 ? (
                <>
                  <select
                    value={selectedPortfolioId || ''}
                    onChange={(e) => setSelectedPortfolioId(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {portfolios.map((portfolio) => (
                      <option key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <span className="text-sm text-gray-600">
                  {user?.username || user?.signInDetails?.loginId}
                </span>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {selectedPortfolioId ? (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'transactions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setActiveTab('allocations')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'allocations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Allocations
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' ? (
              <PortfolioDashboard portfolioId={selectedPortfolioId} />
            ) : activeTab === 'transactions' ? (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowTransactionForm(true);
                      setShowCSVUpload(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Transaction
                  </button>
                  <button
                    onClick={() => {
                      setShowCSVUpload(true);
                      setShowTransactionForm(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Import CSV
                  </button>
                </div>

                {/* Forms */}
                {showTransactionForm && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Add Transaction</h3>
                    <TransactionForm
                      portfolioId={selectedPortfolioId}
                      onSuccess={() => setShowTransactionForm(false)}
                      onCancel={() => setShowTransactionForm(false)}
                    />
                  </div>
                )}

                {showCSVUpload && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Import Transactions from CSV</h3>
                    <CSVUpload
                      portfolioId={selectedPortfolioId}
                      onSuccess={() => setShowCSVUpload(false)}
                      onCancel={() => setShowCSVUpload(false)}
                    />
                  </div>
                )}

                {/* Transaction List */}
                <TransactionList portfolioId={selectedPortfolioId} />
              </div>
            ) : (
              <AllocationManager portfolioId={selectedPortfolioId} />
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              No portfolios found. A portfolio will be created automatically when you add your first
              transaction.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
