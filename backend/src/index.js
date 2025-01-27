import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import User from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dome-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Daily reset at midnight
cron.schedule('0 0 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const users = await User.find();
    
    // Compare points and update daily wins
    if (users.length === 2) {
      const todayTasks = users.map(user => ({
        name: user.name,
        points: user.tasks
          .filter(task => task.date === today && task.completed)
          .reduce((sum, task) => sum + task.points, 0)
      }));

      if (todayTasks[0].points > todayTasks[1].points) {
        await User.findOneAndUpdate(
          { name: todayTasks[0].name },
          { $inc: { 'stats.dailyWins': 1 } }
        );
      } else if (todayTasks[1].points > todayTasks[0].points) {
        await User.findOneAndUpdate(
          { name: todayTasks[1].name },
          { $inc: { 'stats.dailyWins': 1 } }
        );
      }
    }

    // Reset daily tasks and insights
    await User.updateMany({}, {
      $pull: {
        tasks: { completed: true },
        training: { date: { $ne: today } }
      },
      $set: {
        'insights.$.question': '',
        'insights.$.insight': '',
        'insights.$.date': today
      }
    });
  } catch (error) {
    console.error('Daily reset error:', error);
  }
});

// Routes
app.get('/api/users/:name', async (req, res) => {
  try {
    const user = await User.findOne({ name: req.params.name });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:name/tasks', async (req, res) => {
  try {
    const user = await User.findOne({ name: req.params.name });
    user.tasks.push(req.body);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:name/tasks/:taskId', async (req, res) => {
  try {
    const user = await User.findOne({ name: req.params.name });
    const task = user.tasks.id(req.params.taskId);
    if (task) {
      task.completed = req.body.completed;
      if (req.body.completed) {
        user.stats.totalPoints += task.points;
      }
      await user.save();
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:name/training', async (req, res) => {
  try {
    const user = await User.findOne({ name: req.params.name });
    user.training.push(req.body);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:name/insights', async (req, res) => {
  try {
    const user = await User.findOne({ name: req.params.name });
    const today = new Date().toISOString().split('T')[0];
    const insight = user.insights.find(i => i.date === today);
    if (insight) {
      Object.assign(insight, req.body);
    } else {
      user.insights.push({ ...req.body, date: today });
    }
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 