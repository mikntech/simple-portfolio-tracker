import { useState } from 'react';
import {
  useAllocations,
  useAllocationSummary,
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
} from '../hooks/useAllocations';
import { useAssetSearch } from '../hooks/useAssets';
import type { Asset, Allocation } from '@portfolio-tracker/shared-types';

interface AllocationManagerProps {
  portfolioId: string;
}

export function AllocationManager({ portfolioId }: AllocationManagerProps) {
  const { data: allocations = [], isLoading: allocationsLoading } = useAllocations(portfolioId);
  const { data: summary, isLoading: summaryLoading } = useAllocationSummary(portfolioId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);

  const isLoading = allocationsLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.targetPercentage, 0);
  const unallocated = 100 - totalAllocated;

  return (
    <div className="space-y-6">
      {/* Allocation Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Portfolio Allocation</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={unallocated <= 0}
          >
            Add Allocation
          </button>
        </div>

        {/* Allocation Overview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Allocated</span>
            <span
              className={`text-sm font-semibold ${totalAllocated === 100 ? 'text-green-600' : 'text-amber-600'}`}
            >
              {totalAllocated.toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${totalAllocated === 100 ? 'bg-green-600' : 'bg-amber-600'}`}
              style={{ width: `${Math.min(totalAllocated, 100)}%` }}
            />
          </div>
          {unallocated > 0 && (
            <p className="text-sm text-gray-600 mt-2">{unallocated.toFixed(2)}% unallocated</p>
          )}
        </div>

        {/* Current Allocations */}
        {allocations.length > 0 ? (
          <div className="space-y-3">
            {summary?.allocations.map((allocation) => (
              <AllocationRow
                key={allocation.assetId}
                allocation={allocation}
                onEdit={() => {
                  const existing = allocations.find((a) => a.assetId === allocation.assetId);
                  if (existing) setEditingAllocation(existing);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No allocations set. Click "Add Allocation" to get started.
          </div>
        )}
      </div>

      {/* Add Allocation Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Add Allocation</h3>
          <AllocationForm
            portfolioId={portfolioId}
            maxPercentage={unallocated}
            existingAssetIds={allocations.map((a) => a.assetId)}
            onSuccess={() => setShowAddForm(false)}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Edit Allocation Form */}
      {editingAllocation && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Allocation</h3>
          <EditAllocationForm
            allocation={editingAllocation}
            maxPercentage={unallocated + editingAllocation.targetPercentage}
            onSuccess={() => setEditingAllocation(null)}
            onCancel={() => setEditingAllocation(null)}
          />
        </div>
      )}
    </div>
  );
}

interface AllocationRowProps {
  allocation: {
    assetId: string;
    asset: Asset;
    targetPercentage: number;
    currentPercentage: number;
    deviation: number;
    currentValue: number;
    targetValue: number;
    rebalanceAmount: number;
  };
  onEdit: () => void;
}

function AllocationRow({ allocation, onEdit }: AllocationRowProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const deviationColor =
    Math.abs(allocation.deviation) < 5
      ? 'text-green-600'
      : Math.abs(allocation.deviation) < 10
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div>
              <h4 className="font-medium">{allocation.asset.symbol}</h4>
              <p className="text-sm text-gray-600">{allocation.asset.name}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 text-sm">
          <div className="text-right">
            <p className="text-gray-500">Target</p>
            <p className="font-medium">{formatPercent(allocation.targetPercentage)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Current</p>
            <p className="font-medium">{formatPercent(allocation.currentPercentage)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Deviation</p>
            <p className={`font-medium ${deviationColor}`}>
              {allocation.deviation > 0 ? '+' : ''}
              {formatPercent(allocation.deviation)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Rebalance</p>
            <p
              className={`font-medium ${allocation.rebalanceAmount > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {allocation.rebalanceAmount > 0 ? '+' : ''}
              {formatCurrency(allocation.rebalanceAmount)}
            </p>
          </div>
        </div>

        <button
          onClick={onEdit}
          className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 rounded-md hover:bg-blue-50"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

interface AllocationFormProps {
  portfolioId: string;
  maxPercentage: number;
  existingAssetIds: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

function AllocationForm({
  portfolioId,
  maxPercentage,
  existingAssetIds,
  onSuccess,
  onCancel,
}: AllocationFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [targetPercentage, setTargetPercentage] = useState('');
  const [showAssetSearch, setShowAssetSearch] = useState(false);

  const { data: searchResults = [] } = useAssetSearch(searchQuery);
  const createAllocation = useCreateAllocation();

  // Filter out already allocated assets
  const availableAssets = searchResults.filter((asset) => !existingAssetIds.includes(asset.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAsset || !targetPercentage) return;

    try {
      await createAllocation.mutateAsync({
        portfolioId,
        assetId: selectedAsset.id,
        targetPercentage: parseFloat(targetPercentage),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create allocation:', error);
    }
  };

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
              {showAssetSearch && availableAssets.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {availableAssets.map((asset) => (
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

      {/* Target Percentage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Allocation (%)
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={maxPercentage}
          value={targetPercentage}
          onChange={(e) => setTargetPercentage(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Max: ${maxPercentage.toFixed(2)}%`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={createAllocation.isPending || !selectedAsset || !targetPercentage}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createAllocation.isPending ? 'Adding...' : 'Add Allocation'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface EditAllocationFormProps {
  allocation: Allocation;
  maxPercentage: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function EditAllocationForm({
  allocation,
  maxPercentage,
  onSuccess,
  onCancel,
}: EditAllocationFormProps) {
  const [targetPercentage, setTargetPercentage] = useState(allocation.targetPercentage.toString());

  const updateAllocation = useUpdateAllocation();
  const deleteAllocation = useDeleteAllocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateAllocation.mutateAsync({
        id: allocation.id,
        data: { targetPercentage: parseFloat(targetPercentage) },
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update allocation:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this allocation?')) {
      try {
        await deleteAllocation.mutateAsync({
          id: allocation.id,
          portfolioId: allocation.portfolioId,
        });
        onSuccess();
      } catch (error) {
        console.error('Failed to delete allocation:', error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Target Percentage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Allocation (%)
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={maxPercentage}
          value={targetPercentage}
          onChange={(e) => setTargetPercentage(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Max: ${maxPercentage.toFixed(2)}%`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={updateAllocation.isPending}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateAllocation.isPending ? 'Updating...' : 'Update Allocation'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteAllocation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleteAllocation.isPending ? 'Deleting...' : 'Delete'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
