const API_URL = 'http://localhost:5000/api';

export const fetchUser = async (name: string) => {
  const response = await fetch(`${API_URL}/users/${name}`);
  return response.json();
};

export const fetchAllUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  return response.json();
};

export const addTask = async (name: string, task: any) => {
  const response = await fetch(`${API_URL}/users/${name}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });
  return response.json();
};

export const updateTask = async (name: string, taskId: string, updates: any) => {
  const response = await fetch(`${API_URL}/users/${name}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  return response.json();
};

export const addTraining = async (name: string, training: any) => {
  const response = await fetch(`${API_URL}/users/${name}/training`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(training),
  });
  return response.json();
};

export const updateInsights = async (name: string, insights: any) => {
  const response = await fetch(`${API_URL}/users/${name}/insights`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(insights),
  });
  return response.json();
}; 