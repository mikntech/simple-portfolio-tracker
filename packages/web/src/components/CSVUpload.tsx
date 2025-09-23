import { useState, useRef } from 'react';
import { useCreateTransactionsBatch } from '../hooks/useTransactions';
import { useAssetSearch, useAssetBySymbol } from '../hooks/useAssets';
import { apiClient } from '../utils/api-client';
import type { CreateTransaction, TransactionType } from '@portfolio-tracker/shared-types';

interface CSVUploadProps {
  portfolioId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface CSVRow {
  symbol: string;
  type: TransactionType;
  quantity: number;
  price: number;
  executedAt: string;
}

export function CSVUpload({ portfolioId, onSuccess, onCancel }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTransactionsBatch = useCreateTransactionsBatch();

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim());

    // Validate required headers
    const requiredHeaders = ['symbol', 'type', 'quantity', 'price', 'date'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const rows: CSVRow[] = [];
    const parseErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());

      try {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate and parse row
        const parsedRow: CSVRow = {
          symbol: row.symbol.toUpperCase(),
          type: validateTransactionType(row.type),
          quantity: parseFloat(row.quantity),
          price: parseFloat(row.price),
          executedAt: new Date(row.date).toISOString(),
        };

        // Validate parsed values
        if (!parsedRow.symbol) throw new Error('Symbol is required');
        if (isNaN(parsedRow.quantity) || parsedRow.quantity <= 0)
          throw new Error('Invalid quantity');
        if (isNaN(parsedRow.price) || parsedRow.price < 0) throw new Error('Invalid price');
        if (isNaN(Date.parse(parsedRow.executedAt))) throw new Error('Invalid date');

        rows.push(parsedRow);
      } catch (error) {
        parseErrors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`
        );
      }
    }

    if (parseErrors.length > 0) {
      setErrors(parseErrors);
    }

    return rows;
  };

  const validateTransactionType = (type: string): TransactionType => {
    const validTypes: TransactionType[] = ['buy', 'sell'];
    const normalizedType = type.toLowerCase() as TransactionType;

    if (!validTypes.includes(normalizedType)) {
      throw new Error(
        `Invalid transaction type: ${type}. Must be one of: ${validTypes.join(', ')}`
      );
    }

    return normalizedType;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCSV(text);
        setPreview(parsed);
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Failed to parse CSV']);
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!preview.length) return;

    setIsProcessing(true);
    setErrors([]);

    try {
      // First, we need to resolve all symbols to asset IDs
      const uniqueSymbols = [...new Set(preview.map((row) => row.symbol))];
      const assetMap = new Map<string, string>();

      // Fetch asset IDs for all symbols
      for (const symbol of uniqueSymbols) {
        try {
          // Search for the asset by symbol
          const searchResults = await apiClient.assets.search({ q: symbol, limit: 1 });
          const asset = searchResults.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase());

          if (asset) {
            assetMap.set(symbol, asset.id);
          } else {
            // Try to get by exact symbol if search didn't work
            try {
              const assetBySymbol = await apiClient.assets.getBySymbol(symbol);
              assetMap.set(symbol, assetBySymbol.id);
            } catch {
              throw new Error(`Asset not found: ${symbol}`);
            }
          }
        } catch (error) {
          setErrors((prev) => [...prev, `Failed to find asset: ${symbol}`]);
        }
      }

      // Create transactions with resolved asset IDs
      const transactions: (CreateTransaction & { userId: string })[] = preview
        .filter((row) => assetMap.has(row.symbol))
        .map((row) => ({
          userId: portfolioId,
          assetId: assetMap.get(row.symbol)!,
          type: row.type,
          quantity: row.quantity,
          price: row.price,
          executedAt: new Date(row.executedAt),
        }));

      if (transactions.length === 0) {
        setErrors(['No valid transactions to import']);
        return;
      }

      await createTransactionsBatch.mutateAsync(transactions);

      // Reset form
      setFile(null);
      setPreview([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onSuccess?.();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to import transactions']);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-sm text-gray-500">
          CSV must contain columns: symbol, type, quantity, price, date. Optional: fee, notes
        </p>
      </div>

      {/* Example Format */}
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-sm font-medium text-gray-700 mb-2">Example CSV format:</p>
        <pre className="text-xs text-gray-600 overflow-x-auto">
          {`symbol,type,quantity,price,date
AAPL,buy,10,150.50,2024-01-15
MSFT,buy,5,380.00,2024-01-20
AAPL,sell,5,160.00,2024-02-01`}
        </pre>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      {preview.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Preview ({preview.length} transactions)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Symbol
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-gray-900">{row.symbol}</td>
                    <td className="px-3 py-2 text-gray-900">{row.type}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{row.quantity}</td>
                    <td className="px-3 py-2 text-right text-gray-900">${row.price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-gray-900">
                      {new Date(row.executedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                ... and {preview.length - 10} more transactions
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!preview.length || isProcessing || errors.length > 0}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Importing...' : `Import ${preview.length} Transactions`}
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
    </div>
  );
}
