import React from 'react';
import { User } from 'lucide-react';
import { Card } from './Card';

export const TaskCard = ({ task }) => {
  if (!task) return null;
  
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-2">{task.title}</h4>
          
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.status === 'kész' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {task.status}
            </span>
            
            {task.owner && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <User className="w-3 h-3" />
                <span>{task.owner.display_name}</span>
              </div>
            )}
          </div>
          
          {task.reward_type && task.reward_value && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Jutalom:</span> {task.reward_value} {task.reward_type}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};