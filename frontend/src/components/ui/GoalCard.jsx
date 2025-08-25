import React from 'react';
import { Target, Users, Calendar, User } from 'lucide-react';
import { Card } from './Card';

export const GoalCard = ({ goal, type = "personal" }) => {
  if (!goal) return null;
  
  const isFamily = type === "family";
  const progress = goal.goal_amount > 0 ? Math.min((goal.balance / goal.goal_amount) * 100, 100) : 0;
  const remainingAmount = Math.max(goal.goal_amount - goal.balance, 0);
  
  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isFamily ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            {isFamily ? (
              <Users className={`w-5 h-5 ${isFamily ? 'text-blue-600' : 'text-green-600'}`} />
            ) : (
              <Target className={`w-5 h-5 ${isFamily ? 'text-blue-600' : 'text-green-600'}`} />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">{goal.name}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isFamily && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                  Családi cél
                </span>
              )}
              {goal.owner_user && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{goal.owner_user.display_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-2xl font-bold text-gray-800">
            {goal.balance?.toLocaleString('hu-HU')} Ft
          </span>
          <p className="text-sm text-gray-500">
            / {goal.goal_amount?.toLocaleString('hu-HU')} Ft
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Haladás</span>
          <span className="text-sm font-semibold text-gray-700">
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              isFamily 
                ? 'bg-gradient-to-r from-blue-400 to-blue-600' 
                : 'bg-gradient-to-r from-green-400 to-green-600'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      {/* Alsó infók */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div>
          <span className="text-sm text-gray-500">Hiányzik még</span>
          <p className="font-semibold text-gray-700">
            {remainingAmount.toLocaleString('hu-HU')} Ft
          </p>
        </div>
        
        {goal.goal_date && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Cél dátum</span>
            </div>
            <p className="font-semibold text-gray-700">
              {new Date(goal.goal_date).toLocaleDateString('hu-HU')}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};