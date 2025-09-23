import { useState } from 'react';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useAssetSearch } from '../hooks/useAssets';
import type { Asset, TransactionType } from '@portfolio-tracker/shared-types';

interface TransactionFormProps {
  portfolioId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TransactionForm({ portfolioId, onSuccess, onCancel }: TransactionFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetSearch, setShowAssetSearch] = useState(false);

  const [formData, setFormData] = useState({
    type: 'buy' as TransactionType,
    quantity: '',
    price: '',
    executedAt: new Date().toISOString().split('T')[0],
  });

  const { data: searchResults = [] } = useAssetSearch(searchQuery);
  const createTransaction = useCreateTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAsset) {
      alert('Please select an asset');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        userId: portfolioId,
        assetId: selectedAsset.id,
        type: formData.type,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        executedAt: new Date(formData.executedAt),
      });

      // Reset form
      setFormData({
        type: 'buy',
        quantity: '',
        price: '',
        executedAt: new Date().toISOString().split('T')[0],
      });
      setSelectedAsset(null);
      setSearchQuery('');

      onSuccess?.();
    } catch (error) {
      console.error('Failed to create transaction:', error);
    }
  };

  const totalValue =
    formData.quantity && formData.price
      ? parseFloat(formData.quantity) * parseFloat(formData.price)
      : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Asset Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
        <div className="relative">
          {selectedAsset ? (
            <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
              <div>
                <span className="font-medium">{selectedAsset.symbol}</span>
                <span className="text-sm text-gray-500 ml-2">{selectedAsset.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAsset(null);
                  setShowAssetSearch(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAssetSearch(true);
                }}
                onFocus={() => setShowAssetSearch(true)}
                placeholder="Search for asset by symbol or name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showAssetSearch && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setShowAssetSearch(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <div className="font-medium">{asset.symbol}</div>
                      <div className="text-sm text-gray-500">{asset.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input
          type="number"
          step="0.0001"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
        <input
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Execution Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Execution Date</label>
        <input
          type="date"
          value={formData.executedAt}
          onChange={(e) => setFormData({ ...formData, executedAt: e.target.value })}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Total Value Display */}
      {totalValue > 0 && (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600">Total Transaction Value</p>
          <p className="text-lg font-semibold">${totalValue.toFixed(2)}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={createTransaction.isPending}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createTransaction.isPending ? 'Creating...' : 'Add Transaction'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
