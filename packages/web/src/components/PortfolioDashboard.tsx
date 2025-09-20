import { useState } from 'react';
import { usePortfolioSummary } from '../hooks/usePortfolios';
import { useHoldings } from '../hooks/useHoldings';
import { useAsset } from '../hooks/useAssets';
import type { Holding, Asset } from '@portfolio-tracker/shared-types';

interface PortfolioDashboardProps {
  portfolioId: string;
}

export function PortfolioDashboard({ portfolioId }: PortfolioDashboardProps) {
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary(portfolioId);
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings(portfolioId);

  const isLoading = summaryLoading || holdingsLoading;

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return <div>No portfolio data available</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Portfolio Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.totalValue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.totalCost)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Gain/Loss</p>
            <p
              className={`text-2xl font-semibold ${summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(summary.totalGainLoss)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Return</p>
            <p
              className={`text-2xl font-semibold ${summary.totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatPercent(summary.totalGainLossPercent)}
            </p>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Holdings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gain/Loss
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Return %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holdings.map((holding) => (
                <HoldingRow key={holding.assetId} holding={holding} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HoldingRow({ holding }: { holding: Holding }) {
  const { data: asset } = useAsset(holding.assetId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{asset?.symbol || 'Loading...'}</div>
          <div className="text-sm text-gray-500">{asset?.name || ''}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
        {holding.quantity.toFixed(4)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
        {formatCurrency(holding.averageCost)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
        {formatCurrency(holding.totalCost)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
        {holding.currentPrice ? formatCurrency(holding.currentPrice) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
        {holding.currentValue ? formatCurrency(holding.currentValue) : '-'}
      </td>
      <td
        className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
          holding.unrealizedGainLoss && holding.unrealizedGainLoss >= 0
            ? 'text-green-600'
            : 'text-red-600'
        }`}
      >
        {holding.unrealizedGainLoss ? formatCurrency(holding.unrealizedGainLoss) : '-'}
      </td>
      <td
        className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
          holding.unrealizedGainLossPercent && holding.unrealizedGainLossPercent >= 0
            ? 'text-green-600'
            : 'text-red-600'
        }`}
      >
        {holding.unrealizedGainLossPercent ? formatPercent(holding.unrealizedGainLossPercent) : '-'}
      </td>
    </tr>
  );
}
