import React, { useState, useEffect } from 'react';
import FAB from '../components/FAB';
import TaskModal from '../components/TaskModal';

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { token, user, apiUrl } = useAuth();

  const fetchTasks = async () => {
    try {
      // JAVÍTVA: Backtick (`) használata
      const response = await fetch(`${apiUrl}/api/tasks`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Hiba a feladatok lekérésekor:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTaskToggle = async (taskId) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId ? { ...task, done: !task.done } : task
    ));
    try {
      await fetch(`${apiUrl}/api/tasks/${taskId}/toggle`, { method: 'POST' });
    } catch (error) {
      console.error("Hiba a feladat állapotának frissítésekor:", error);
      fetchTasks();
    }
  };
  
  const handleSaveTask = async (taskData) => {
    try {
      // JAVÍTVA: Backtick (`) használata
      const response = await fetch(`${apiUrl}/api/tasks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (response.ok) {
        setIsModalOpen(false);
        fetchTasks();
      } else {
        alert('Hiba a mentés során!');
      }
    } catch (error) {
      console.error("Hiba az új feladat létrehozásakor:", error);
    }
  };

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation();
    if (!window.confirm('Biztosan törölni szeretnéd ezt a feladatot?')) return;
    try {
      const response = await fetch(`${apiUrl}/api/tasks/${taskId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTasks();
      } else {
        alert('Hiba a törlés során!');
      }
    } catch (error) {
      console.error("Hiba a feladat törlésekor:", error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Feladatok</h1>
      </div>
      
      <div className="task-list">
        {tasks.map((task) => (
          <div className="task-item" key={task.id} onClick={() => handleTaskToggle(task.id)}>
            <div className="task-info">
              <div className={`task-checkbox ${task.done ? 'checked' : ''}`}></div>
              <div>
                <div style={{ fontWeight: 500 }}>{task.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{task.owner}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="task-reward">{task.reward}</div>
              <button className="delete-btn" onClick={(e) => handleDeleteTask(e, task.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <FAB onClick={() => setIsModalOpen(true)} />
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
      />
    </div>
  );
}

export default TasksPage;