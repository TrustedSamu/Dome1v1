import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export interface User {
  name: string;
  tasks: Task[];
  training: TrainingData[];
  insights: DailyInsight[];
  stats: {
    totalPoints: number;
    dailyWins: number;
  };
  sleep?: {
    date: string;
    sleepTime: string;
    wakeTime: string;
    duration: number;  // in hours
  };
}

interface Task {
  id: string;
  text: string;
  points: number;
  completed: boolean;
  date: string;
  note?: string;
  isRecurring?: boolean;
}

interface TrainingData {
  bodyPart: string;
  rating: number;
  date: string;
  id: string;
}

interface DailyInsight {
  question: string;
  insight: string;
  date: string;
}

export const getUser = async (name: string): Promise<User | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, name);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() as User : null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as User);
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

export const addTask = async (name: string, task: Omit<Task, 'id'>) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const taskWithId = { ...task, id: Date.now().toString() };
  await updateDoc(userRef, {
    tasks: arrayUnion(taskWithId)
  });
  return taskWithId;
};

export const updateTask = async (name: string, taskId: string, updates: Partial<Task>) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const user = await getUser(name);
  if (!user) return null;

  const updatedTasks = user.tasks.map(task => 
    task.id === taskId ? { ...task, ...updates } : task
  );

  await updateDoc(userRef, { tasks: updatedTasks });

  // Update points based on completion status
  const task = user.tasks.find(t => t.id === taskId);
  if (task) {
    const pointChange = updates.completed ? task.points : -task.points;
    await updateDoc(userRef, {
      'stats.totalPoints': user.stats.totalPoints + pointChange
    });
  }

  return updatedTasks;
};

export const addTraining = async (name: string, training: Omit<TrainingData, 'id'>) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const trainingWithId = { ...training, id: Date.now().toString() };
  await updateDoc(userRef, {
    training: arrayUnion(trainingWithId)
  });
  return trainingWithId;
};

export const updateInsights = async (name: string, insights: DailyInsight) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const user = await getUser(name);
  if (!user) return null;

  const updatedInsights = user.insights.filter(i => i.date !== insights.date);
  updatedInsights.push(insights);

  await updateDoc(userRef, { insights: updatedInsights });
  return insights;
};

export const initializeUsers = async () => {
  try {
    const users = ['Dominik', 'Samu'];
    for (const name of users) {
      const userRef = doc(db, USERS_COLLECTION, name);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log(`Initializing user: ${name}`);
        await setDoc(userRef, {
          name,
          tasks: [],
          training: [],
          insights: [],
          stats: {
            totalPoints: 0,
            dailyWins: 0
          }
        });
      }
    }
  } catch (error) {
    console.error('Error initializing users:', error);
    throw error;
  }
};

// Function to reset daily tasks and update wins
export const performDailyReset = async () => {
  const today = new Date().toISOString().split('T')[0];
  const users = await getAllUsers();

  // Compare points and update daily wins
  if (users.length === 2) {
    const todayPoints = users.map(user => ({
      name: user.name,
      points: user.tasks
        .filter(task => task.date === today && task.completed)
        .reduce((sum, task) => sum + task.points, 0)
    }));

    if (todayPoints[0].points > todayPoints[1].points) {
      const userRef = doc(db, USERS_COLLECTION, todayPoints[0].name);
      const user = await getUser(todayPoints[0].name);
      if (user) {
        await updateDoc(userRef, {
          'stats.dailyWins': user.stats.dailyWins + 1
        });
      }
    } else if (todayPoints[1].points > todayPoints[0].points) {
      const userRef = doc(db, USERS_COLLECTION, todayPoints[1].name);
      const user = await getUser(todayPoints[1].name);
      if (user) {
        await updateDoc(userRef, {
          'stats.dailyWins': user.stats.dailyWins + 1
        });
      }
    }
  }

  // Reset tasks and training for each user
  for (const user of users) {
    const userRef = doc(db, USERS_COLLECTION, user.name);
    await updateDoc(userRef, {
      tasks: user.tasks.filter(task => !task.completed),
      training: user.training.filter(t => t.date === today),
      insights: user.insights.map(i => 
        i.date === today ? i : { question: '', insight: '', date: today }
      )
    });
  }
};

export const deleteTraining = async (name: string, trainingId: string) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const user = await getUser(name);
  if (!user) return null;

  const updatedTraining = user.training.filter(t => t.id !== trainingId);
  await updateDoc(userRef, { training: updatedTraining });
  return updatedTraining;
};

// Add function to initialize daily tasks
export const initializeDailyTasks = async (name: string) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const today = new Date().toISOString().split('T')[0];
  
  const dailyTasks = [
    { text: 'Make the bed', points: 5, isRecurring: true },
    { text: 'Read (15+ minutes)', points: 10, isRecurring: true },
    { text: 'Meditate/Pray', points: 10, isRecurring: true },
    { text: 'Brush teeth (morning)', points: 5, isRecurring: true },
    { text: 'Brush teeth (evening)', points: 5, isRecurring: true },
  ];

  const tasksWithIds = dailyTasks.map(task => ({
    ...task,
    id: `daily-${task.text}-${today}`,
    completed: false,
    date: today
  }));

  // Only add tasks that don't already exist for today
  const user = await getUser(name);
  if (user) {
    const existingDailyTaskIds = user.tasks
      .filter(t => t.date === today && t.isRecurring)
      .map(t => t.text);

    const newTasks = tasksWithIds.filter(task => 
      !existingDailyTaskIds.includes(task.text)
    );

    if (newTasks.length > 0) {
      await updateDoc(userRef, {
        tasks: arrayUnion(...newTasks)
      });
    }
  }
};

// Add function to track weed usage
export const trackWeedUsage = async (name: string, used: boolean, note?: string) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const today = new Date().toISOString().split('T')[0];
  
  const user = await getUser(name);
  if (!user) return null;

  const existingWeedTask = user.tasks.find(t => 
    t.date === today && t.text === 'Smoked weed today'
  );

  if (existingWeedTask) {
    // Update existing entry
    const updatedTasks = user.tasks.map(task => 
      task.id === existingWeedTask.id 
        ? { ...task, completed: used, note } 
        : task
    );
    await updateDoc(userRef, { tasks: updatedTasks });
  } else {
    // Create new entry
    const weedTask = {
      id: `weed-${today}`,
      text: 'Smoked weed today',
      points: -10, // Negative points for smoking
      completed: used,
      date: today,
      note,
      isRecurring: true
    };
    await updateDoc(userRef, {
      tasks: arrayUnion(weedTask)
    });
  }
};

export const updateSleepTime = async (name: string, sleepTime: string, date: string) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const user = await getUser(name);
  if (!user) return null;

  // Get the previous day's wake time to calculate duration
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];

  await updateDoc(userRef, {
    sleep: {
      date,
      sleepTime,
      wakeTime: user.sleep?.wakeTime || '',
      duration: user.sleep?.date === prevDateStr && user.sleep.wakeTime 
        ? calculateSleepDuration(sleepTime, user.sleep.wakeTime)
        : 0
    }
  });
};

export const updateWakeTime = async (name: string, wakeTime: string, date: string) => {
  const userRef = doc(db, USERS_COLLECTION, name);
  const user = await getUser(name);
  if (!user) return null;

  // Calculate duration if we have both times
  const duration = user.sleep?.sleepTime
    ? calculateSleepDuration(user.sleep.sleepTime, wakeTime)
    : 0;

  await updateDoc(userRef, {
    sleep: {
      ...user.sleep,
      date,
      wakeTime,
      duration
    }
  });
};

const calculateSleepDuration = (sleepTime: string, wakeTime: string): number => {
  const sleep = new Date(`2000-01-01T${sleepTime}`);
  const wake = new Date(`2000-01-01T${wakeTime}`);
  
  // If wake time is earlier than sleep time, add a day to wake time
  if (wake < sleep) {
    wake.setDate(wake.getDate() + 1);
  }
  
  const diff = wake.getTime() - sleep.getTime();
  return Math.round((diff / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal place
}; 