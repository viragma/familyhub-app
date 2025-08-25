import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from './Card';

export const FinancialSummaryCard = ({ financial_summary }) => {
  if (!financial_summary) return null;
  
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {financial_summary.balance_title || "Pénzügyi összefoglaló"}
        </h3>
        <TrendingUp className="w-5 h-5 text-green-600" />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Jelenlegi egyenleg</span>
          <span className="text-2xl font-bold text-green-600">
            {financial_summary.total_balance?.toLocaleString('hu-HU')} Ft
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
          <div>
            <span className="text-sm text-gray-500">Havi bevétel</span>
            <p className="text-lg font-semibold text-green-500">
              +{financial_summary.monthly_income?.toLocaleString('hu-HU')} Ft
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Havi kiadás</span>
            <p className="text-lg font-semibold text-red-500">
              -{financial_summary.monthly_expense?.toLocaleString('hu-HU')} Ft
            </p>
          </div>
        </div>
        
        <div className="pt-2">
          <span className="text-sm text-gray-500">Havi megtakarítás</span>
          <p className={`text-xl font-bold ${
            (financial_summary.monthly_savings || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {financial_summary.monthly_savings >= 0 ? '+' : ''}{financial_summary.monthly_savings?.toLocaleString('hu-HU')} Ft
          </p>
        </div>
      </div>
    </Card>
  );
};