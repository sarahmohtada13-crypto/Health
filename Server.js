const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.use(express.static('Public'));

// Placeholder helper objects so the server starts smoothly
const MONTHLY_MENU = { 1: {} };
const calculateStairCaloriesBurned = () => ({ totalKj: 0, totalKcal: 0 });

// Your main route
app.post('/api/evaluate-health', async (req, res) => {
  try {
    const { 
      nickname, gender, heightCm, weightKg, dayOfMonth, 
      selectedMeals, customSnacksCalories, stairClimbs, 
      pulseRate, waterGlasses, stressLevel 
    } = req.body;

    const bmi = parseFloat((weightKg / ((heightCm / 100) ** 2)).toFixed(1));
    const waterMl = waterGlasses * 250;
    const dailyMenu = MONTHLY_MENU[dayOfMonth] || MONTHLY_MENU[1];

    let baseIntake = 0;
    if (selectedMeals && Array.isArray(selectedMeals)) {
      selectedMeals.forEach(mealKey => {
        if (dailyMenu[mealKey]) baseIntake += dailyMenu[mealKey];
      });
    }
    
    const totalCalorieIntake = baseIntake + (customSnacksCalories || 0);
    const { totalKcal } = calculateStairCaloriesBurned(stairClimbs || []);

    // --- Rebalanced 100-Point Scoring Algorithm ---
    let bmiScore = (bmi >= 18.5 && bmi <= 24.9) ? 20 : (bmi < 18.5 ? 14 : 10);

    const targetCal = (gender && gender.toLowerCase() === 'male') ? 2500 : 2000;
    let calorieScore = Math.max(0, 20 - (Math.abs(totalCalorieIntake - targetCal) / 50));

    const totalClimbs = (stairClimbs || []).reduce((acc, curr) => acc + (curr.count || 0), 0);
    let activityScore = Math.min(20, (totalClimbs / 100) * 20);

    let pulseScore = 10;
    if (pulseRate < 60 || pulseRate > 100) pulseScore = 6;
    if (pulseRate < 50 || pulseRate > 120) pulseScore = 3;

    let waterScore = Math.min(15, ((waterGlasses || 0) / 8) * 15);
    let stressScore = ((stressLevel || 0) / 5) * 15;

    const totalScore = bmiScore + calorieScore + activityScore + pulseScore + waterScore + stressScore;

    res.json({
      nickname,
      bmi,
      waterMl,
      totalCalorieIntake,
      totalKcal,
      scores: {
        bmiScore,
        calorieScore,
        activityScore,
        pulseScore,
        waterScore,
        stressScore,
        totalScore: Math.round(totalScore)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
