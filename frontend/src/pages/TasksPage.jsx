import React, { useState, useEffect } from 'react';
import FAB from '../components/FAB';
import TaskModal from '../components/TaskModal';

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  // Adatok lekérése csak a feladatokhoz
  const fetchTasks = async () => {
    try {
      const response = await fetch('${apiUrl}/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Hiba a feladatok lekérésekor:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // === Ide másoljuk az összes feladatkezelő funkciót ===

  const handleTaskToggle = async (taskId) => {
    // Optimistic update
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId ? { ...task, done: !task.done } : task
    ));
    // API hívás
    try {
      await fetch(`${apiUrl}/api/tasks/${taskId}/toggle`, { method: 'POST' });
    } catch (error) {
      console.error("Hiba a feladat állapotának frissítésekor:", error);
      fetchTasks(); // Hiba esetén szinkronizáljuk újra
    }
  };
  
  const handleSaveTask = async (taskData) => {
    try {
      const response = await fetch('${apiUrl}/api/tasks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (response.ok) {
        setIsModalOpen(false);
        fetchTasks(); // Frissítjük a listát
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
        fetchTasks(); // Frissítjük a listát
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
        {/* A jövőben ide jöhetnek szűrők vagy egyéb vezérlők */}
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