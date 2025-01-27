import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  text: String,
  points: Number,
  completed: Boolean,
  date: String
});

const trainingSchema = new mongoose.Schema({
  bodyPart: String,
  rating: Number,
  date: String
});

const insightSchema = new mongoose.Schema({
  question: String,
  insight: String,
  date: String
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Dominik', 'Samu']
  },
  tasks: [taskSchema],
  training: [trainingSchema],
  insights: [insightSchema],
  stats: {
    totalPoints: { type: Number, default: 0 },
    dailyWins: { type: Number, default: 0 }
  }
});

export default mongoose.model('User', userSchema); 