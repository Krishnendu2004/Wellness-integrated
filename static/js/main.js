// Hide loading screen
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('fade-out');
    }, 500);
});

// Global variables
let macroChart = null;

// Toast function
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = 'toast-message' + (isError ? ' error' : '');
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Helper functions for position display
function getPositionEmoji(position) {
    const emojis = {
        'goalkeeper': '🧤',
        'defender': '🛡️',
        'midfielder': '⚡',
        'forward': '🎯',
        'athlete': '💪',
        'sedentary': '🪑'
    };
    return emojis[position] || '⚡';
}

function getPositionName(position) {
    const names = {
        'goalkeeper': 'Goalkeeper',
        'defender': 'Defender',
        'midfielder': 'Midfielder',
        'forward': 'Forward',
        'athlete': 'Athlete',
        'sedentary': 'Sedentary'
    };
    return names[position] || 'Midfielder';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded - initializing app...');
    
    // Load cuisines
    loadCuisines();
    
    // Load initial food recommendations using profile
    setTimeout(loadFoodRecommendations, 500);
    
    // Image upload elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('foodImage');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4361ee';
            uploadArea.style.background = '#eef2ff';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.background = '#f8fafc';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.background = '#f8fafc';
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImage(file);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                handleImage(e.target.files[0]);
            }
        });
    }
    
    // Search functionality - only search, no filters
    const searchInput = document.getElementById('searchFood');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                loadFoodRecommendations();
            }, 500);
        });
    }
    
    // Listen for profile changes
    const profileInputs = ['cuisine', 'preference', 'goal', 'position'];
    profileInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', function() {
                console.log(`Profile changed: ${id} = ${this.value}`);
                updateProfileDisplay();
                loadFoodRecommendations();
            });
        }
    });
    
    // Update profile display initially
    updateProfileDisplay();
});

// Update profile display badges
function updateProfileDisplay() {
    const cuisine = document.getElementById('cuisine')?.value || 'All';
    const preference = document.getElementById('preference')?.value || 'all';
    const position = document.getElementById('position')?.value || 'midfielder';
    
    const cuisineBadge = document.getElementById('activeCuisine');
    const preferenceBadge = document.getElementById('activePreference');
    const positionBadge = document.getElementById('activePosition');
    const positionDisplay = document.getElementById('positionDisplay');
    
    if (cuisineBadge) {
        const cuisineText = cuisine === 'All' ? '🌍 All Cuisines' : `🌍 ${cuisine}`;
        cuisineBadge.textContent = cuisineText;
    }
    
    if (preferenceBadge) {
        const prefText = preference === 'veg' ? '🌱 Vegetarian' : 
                        preference === 'non-veg' ? '🍗 Non-Veg' : '🌱 All Types';
        preferenceBadge.textContent = prefText;
    }
    
    if (positionBadge) {
        positionBadge.textContent = getPositionEmoji(position) + ' ' + getPositionName(position);
    }
    
    if (positionDisplay) {
        positionDisplay.textContent = getPositionEmoji(position) + ' ' + getPositionName(position);
    }
}

// ============================================
// LOAD CUISINES FROM DATABASE
// ============================================
function loadCuisines() {
    fetch('/api/cuisines')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.cuisines) {
                const cuisineSelect = document.getElementById('cuisine');
                
                if (cuisineSelect) {
                    cuisineSelect.innerHTML = '<option value="All">🌍 All Cuisines</option>';
                    
                    data.cuisines.forEach(cuisine => {
                        if (cuisine && cuisine !== 'Various' && cuisine !== 'Unknown') {
                            cuisineSelect.innerHTML += `<option value="${cuisine}">${cuisine}</option>`;
                        }
                    });
                    
                    console.log(`✅ Loaded ${data.cuisines.length} cuisines`);
                }
            }
        })
        .catch(error => console.error('Error loading cuisines:', error));
}

// ============================================
// LOAD FOOD RECOMMENDATIONS - USING PROFILE ONLY
// ============================================
function loadFoodRecommendations() {
    // Get values from profile section ONLY
    const cuisine = document.getElementById('cuisine')?.value || 'All';
    const preference = document.getElementById('preference')?.value || 'all';
    const position = document.getElementById('position')?.value || 'midfielder';
    const goal = document.getElementById('goal')?.value || 'maintenance';
    const search = document.getElementById('searchFood')?.value || '';
    
    // Update display badges
    updateProfileDisplay();
    
    // Show loading
    const container = document.getElementById('foodList');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-5" style="grid-column: 1 / -1;">
                <div class="loader" style="margin: 0 auto;"></div>
                <p class="text-white mt-3">Loading foods based on your profile...</p>
            </div>
        `;
    }
    
    // Build URL with profile data only
    let url = `/api/get_foods?cuisine=${encodeURIComponent(cuisine)}&preference=${encodeURIComponent(preference)}&category=all`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    // Add goal-based filtering
    if (goal === 'weight_loss') {
        url += '&max_calories=300';
    } else if (goal === 'muscle_gain') {
        url += '&min_protein=20';
    }
    
    // Add position-based filtering
    if (position === 'midfielder' || position === 'forward') {
        url += '&high_carbs=true';
    } else if (position === 'goalkeeper' || position === 'defender') {
        url += '&high_protein=true';
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayFoodRecommendations(data.foods);
            }
        })
        .catch(error => {
            console.error('Error loading food recommendations:', error);
            if (container) {
                container.innerHTML = '<div class="text-center py-5 text-danger" style="grid-column: 1 / -1;">Error loading foods</div>';
            }
        });
}

// Display food recommendations with improved cards
function displayFoodRecommendations(foods) {
    const container = document.getElementById('foodList');
    if (!container) return;
    
    if (!foods || foods.length === 0) {
        container.innerHTML = '<div class="text-center py-5" style="grid-column: 1 / -1;"><p class="text-white">No foods found matching your profile</p></div>';
        return;
    }
    
    let html = '';
    foods.forEach(food => {
        // Determine badge classes
        const regionClass = 'food-badge region';
        const categoryClass = 'food-badge category';
        const typeClass = food.type === 'veg' ? 'food-badge veg' : 'food-badge non-veg';
        const typeLabel = food.type === 'veg' ? '🌱 Veg' : '🍗 Non-Veg';
        
        // Format region name
        const region = food.region || 'Various';
        
        // Format category
        const category = food.category || 'main';
        
        // Health score
        const healthScore = food.health_score || Math.floor(Math.random() * 20) + 70;
        
        html += `
            <div class="food-card" onclick='showFoodDetails(${JSON.stringify(food).replace(/'/g, "\\'")})'>
                <div class="health-score">${healthScore}</div>
                <h3 class="food-name">${food.name}</h3>
                
                <div class="food-badges">
                    <span class="${regionClass}">${region}</span>
                    <span class="${categoryClass}">${category}</span>
                    <span class="${typeClass}">${typeLabel}</span>
                </div>
                
                <div class="food-nutrients">
                    <div class="nutrient">
                        <div class="nutrient-value">${food.calories}</div>
                        <div class="nutrient-label">kcal</div>
                    </div>
                    <div class="nutrient">
                        <div class="nutrient-value">${food.protein}g</div>
                        <div class="nutrient-label">P</div>
                    </div>
                    <div class="nutrient">
                        <div class="nutrient-value">${food.carbs}g</div>
                        <div class="nutrient-label">C</div>
                    </div>
                    <div class="nutrient">
                        <div class="nutrient-value">${food.fat}g</div>
                        <div class="nutrient-label">F</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Show food details in a modal with ingredients
function showFoodDetails(food) {
    let modal = document.getElementById('foodDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'foodDetailModal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Food Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="foodDetailModalBody">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const modalBody = document.getElementById('foodDetailModalBody');
    const typeLabel = food.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian';
    const typeClass = food.type === 'veg' ? 'success' : 'danger';
    
    let ingredientsHtml = '';
    if (food.ingredients_list && food.ingredients_list.length > 0) {
        ingredientsHtml = '<div class="mb-3"><h6>🥘 Ingredients</h6><div class="d-flex flex-wrap gap-2">';
        food.ingredients_list.forEach(ing => {
            ingredientsHtml += `<span class="ingredient-tag">${ing}</span>`;
        });
        ingredientsHtml += '</div></div>';
    } else if (food.ingredients) {
        const ingredients = food.ingredients.split(',').map(i => i.trim());
        ingredientsHtml = '<div class="mb-3"><h6>🥘 Ingredients</h6><div class="d-flex flex-wrap gap-2">';
        ingredients.forEach(ing => {
            ingredientsHtml += `<span class="ingredient-tag">${ing}</span>`;
        });
        ingredientsHtml += '</div></div>';
    } else {
        ingredientsHtml = '<div class="mb-3"><h6>🥘 Ingredients</h6><p class="text-muted">Traditional ingredients, fresh spices</p></div>';
    }
    
    modalBody.innerHTML = `
        <div class="text-center mb-4">
            <h3 class="text-primary">${food.name}</h3>
            <div>
                <span class="badge bg-primary me-2">${food.region}</span>
                <span class="badge bg-${typeClass} me-2">${typeLabel}</span>
                <span class="badge bg-warning text-dark">${food.category}</span>
            </div>
        </div>
        
        <div class="row g-3 mb-4">
            <div class="col-3 text-center">
                <div class="p-3 bg-light rounded">
                    <div class="fs-4 fw-bold text-primary">${food.calories}</div>
                    <small>Calories</small>
                </div>
            </div>
            <div class="col-3 text-center">
                <div class="p-3 bg-light rounded">
                    <div class="fs-4 fw-bold text-success">${food.protein}g</div>
                    <small>Protein</small>
                </div>
            </div>
            <div class="col-3 text-center">
                <div class="p-3 bg-light rounded">
                    <div class="fs-4 fw-bold text-warning">${food.carbs}g</div>
                    <small>Carbs</small>
                </div>
            </div>
            <div class="col-3 text-center">
                <div class="p-3 bg-light rounded">
                    <div class="fs-4 fw-bold text-info">${food.fat}g</div>
                    <small>Fat</small>
                </div>
            </div>
        </div>
        
        <div class="row g-3 mb-4">
            <div class="col-4 text-center">
                <div class="p-3 bg-light rounded">
                    <div class="fw-bold">${food.fiber || 0}g</div>
                    <small>Fiber</small>
                </div>
            </div>
            <div class="col-4 text-center">
                <div class="p-3 bg-light rounded">
                    <div class="fw-bold">${food.prep_time || 30} mins</div>
                    <small>Prep Time</small>
                </div>
            </div>
            <div class="col-4 text-center">
                <div class="p-3 bg-light rounded">
                    <div class="fw-bold">${food.health_score || 75}</div>
                    <small>Health Score</small>
                </div>
            </div>
        </div>
        
        <div class="mb-3">
            <h6>📝 Description</h6>
            <p class="text-muted">${food.description || `Delicious ${food.name} from ${food.region} cuisine.`}</p>
        </div>
        
        ${ingredientsHtml}
    `;
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// ============================================
// MAIN FUNCTION - GENERATE ALL RESULTS WITH ONE CLICK
// ============================================
function calculateNutrition() {
    // Get all user inputs from the profile section
    const age = document.getElementById('age')?.value || 30;
    const weight = document.getElementById('weight')?.value || 70;
    const height = document.getElementById('height')?.value || 170;
    const gender = document.getElementById('gender')?.value || 'male';
    const activity = document.getElementById('activity')?.value || 'moderate';
    const goal = document.getElementById('goal')?.value || 'maintenance';
    const preference = document.getElementById('preference')?.value || 'all';
    const cuisine = document.getElementById('cuisine')?.value || 'All';
    const position = document.getElementById('position')?.value || 'midfielder';
    
    // Show loading state
    showToast('🔄 Generating your meal plan...');
    
    const data = {
        age: parseFloat(age),
        weight: parseFloat(weight),
        height: parseFloat(height),
        gender: gender,
        activity_level: activity,
        goal: goal,
        preference: preference,
        cuisine: cuisine,
        position: position
    };

    // Calculate nutrition using your macro model
    fetch('/api/calculate_nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update nutrition results
            document.getElementById('caloriesResult').textContent = data.target_calories;
            document.getElementById('proteinResult').textContent = data.macros.protein + 'g';
            document.getElementById('carbsResult').textContent = data.macros.carbs + 'g';
            document.getElementById('fatResult').textContent = data.macros.fat + 'g';
            
            // Update chart
            updateMacroChart(data.macros.protein, data.macros.carbs, data.macros.fat);
            
            // Display meal plan
            displayMealPlan(data.meal_plan, data.totals);
            
            // Update position display
            const positionDisplay = document.getElementById('positionDisplay');
            if (positionDisplay) {
                positionDisplay.textContent = getPositionEmoji(data.position) + ' ' + getPositionName(data.position);
            }
            
            // Show BMI result
            const bmiResult = document.getElementById('bmiResult');
            if (bmiResult && data.bmi) {
                let bmiColor = '#06d6a0';
                if (data.bmi.category === 'Underweight') bmiColor = '#ffd166';
                else if (data.bmi.category === 'Overweight') bmiColor = '#f8961e';
                else if (data.bmi.category === 'Obese') bmiColor = '#ef476f';
                
                bmiResult.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; font-weight: 800; color: ${bmiColor};">${data.bmi.bmi}</div>
                        <div style="font-size: 1rem; margin-bottom: 0.5rem;">${data.bmi.category}</div>
                        <small>${data.bmi.advice}</small>
                    </div>
                `;
                bmiResult.classList.add('show');
            }
            
            // Show ideal weight
            const weightResult = document.getElementById('weightResult');
            if (weightResult && data.ideal_weight) {
                weightResult.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; font-weight: 800; color: #4361ee;">${data.ideal_weight}</div>
                        <div style="font-size: 0.9rem;">kg</div>
                    </div>
                `;
                weightResult.classList.add('show');
            }
            
            // Show water intake
            const waterResult = document.getElementById('waterResult');
            if (waterResult && data.water_intake) {
                waterResult.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; font-weight: 800; color: #4cc9f0;">${data.water_intake}</div>
                        <div style="font-size: 0.9rem;">L per day</div>
                    </div>
                `;
                waterResult.classList.add('show');
            }
            
            // Show sleep recommendation
            const sleepResult = document.getElementById('sleepResult');
            if (sleepResult && data.sleep_recommendation) {
                sleepResult.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; font-weight: 800; color: #06d6a0;">${data.sleep_recommendation}</div>
                        <div style="font-size: 0.9rem;">recommended</div>
                    </div>
                `;
                sleepResult.classList.add('show');
            }
            
            showToast('✅ Meal plan generated!');
        } else {
            showToast('Error: ' + (data.error || 'Unknown error'), true);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error connecting to server', true);
    });
}

// Update macro chart
function updateMacroChart(protein, carbs, fat) {
    const canvas = document.getElementById('macroChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (macroChart) {
        macroChart.destroy();
    }
    
    macroChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [protein, carbs, fat],
                backgroundColor: ['#4361ee', '#06d6a0', '#ffd166'],
                borderWidth: 0,
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12, weight: '500' },
                        color: '#334155'
                    }
                }
            }
        }
    });
}

// ============================================
// FIXED DISPLAY MEAL PLAN WITH SIMPLE NAMES
// ============================================
function displayMealPlan(mealPlan, totals) {
    const container = document.getElementById('mealPlan');
    if (!container) return;
    
    if (!mealPlan || mealPlan.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="glass-card text-center py-5">
                    <i class="fas fa-utensils fa-4x mb-3 text-muted opacity-50"></i>
                    <p class="text-muted">Your meal plan will appear here</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Calculate percentages
    const totalCalories = totals.calories;
    const proteinPercent = ((totals.protein * 4 / totalCalories) * 100).toFixed(1);
    const carbsPercent = ((totals.carbs * 4 / totalCalories) * 100).toFixed(1);
    const fatPercent = ((totals.fat * 9 / totalCalories) * 100).toFixed(1);
    
    let html = `
        <div class="col-12 mb-4">
            <div class="result-card p-4">
                <h4 class="mb-1 text-white">Planned Intake Summary</h4>
                <div class="small text-white-50 mb-3">Totals from generated meals</div>
                <div class="row text-center">
                    <div class="col-3">
                        <div class="text-white">
                            <div class="fs-2 fw-bold">${totals.calories}</div>
                            <div class="small opacity-75">Calories</div>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="text-white">
                            <div class="fs-2 fw-bold">${totals.protein}g</div>
                            <div class="small opacity-75">Protein</div>
                            <div class="small opacity-75">${proteinPercent}%</div>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="text-white">
                            <div class="fs-2 fw-bold">${totals.carbs}g</div>
                            <div class="small opacity-75">Carbs</div>
                            <div class="small opacity-75">${carbsPercent}%</div>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="text-white">
                            <div class="fs-2 fw-bold">${totals.fat}g</div>
                            <div class="small opacity-75">Fat</div>
                            <div class="small opacity-75">${fatPercent}%</div>
                        </div>
                    </div>
                </div>
                <div class="progress mt-3" style="height: 8px; background: rgba(255,255,255,0.2);">
                    <div class="progress-bar" style="width: ${proteinPercent}%; background: #4361ee;"></div>
                    <div class="progress-bar" style="width: ${carbsPercent}%; background: #06d6a0;"></div>
                    <div class="progress-bar" style="width: ${fatPercent}%; background: #ffd166;"></div>
                </div>
            </div>
        </div>
    `;
    
    // Simple meal icons mapping
    const mealIcons = {
        '🍳 Breakfast': '🍳',
        '🥪 Morning Snack': '🥪',
        '🍲 Lunch': '🍲',
        '🍎 Evening Snack': '🍎',
        '🍽️ Dinner': '🍽️',
        'Breakfast': '🍳',
        'Morning Snack': '🥪',
        'Lunch': '🍲',
        'Evening Snack': '🍎',
        'Dinner': '🍽️'
    };
    
    // Color mapping for different meals
    const mealColors = {
        '🍳 Breakfast': '#4361ee',
        '🥪 Morning Snack': '#4cc9f0',
        '🍲 Lunch': '#f8961e',
        '🍎 Evening Snack': '#ffd166',
        '🍽️ Dinner': '#06d6a0',
        'Breakfast': '#4361ee',
        'Morning Snack': '#4cc9f0',
        'Lunch': '#f8961e',
        'Evening Snack': '#ffd166',
        'Dinner': '#06d6a0'
    };
    
    mealPlan.forEach(meal => {
        const mealIcon = mealIcons[meal.meal] || '🍽️';
        const mealColor = mealColors[meal.meal] || '#4361ee';
        const mealCalPercent = ((meal.calories / totalCalories) * 100).toFixed(1);
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="meal-plan-card" style="border-left-color: ${mealColor};">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="meal-time" style="color: ${mealColor};">${mealIcon} ${meal.meal}</div>
                        <span class="badge" style="background: ${mealColor};">${mealCalPercent}%</span>
                    </div>
                    <div class="meal-name">${meal.food}</div>
                    <div class="meal-nutrients">
                        <div class="meal-nutrient">
                            <i class="fas fa-fire text-danger"></i>
                            <span><strong>${meal.calories}</strong> kcal</span>
                        </div>
                        <div class="meal-nutrient">
                            <i class="fas fa-dumbbell" style="color: ${mealColor};"></i>
                            <span><strong>${meal.protein}g</strong> P</span>
                        </div>
                        <div class="meal-nutrient">
                            <i class="fas fa-bolt text-success"></i>
                            <span><strong>${meal.carbs}g</strong> C</span>
                        </div>
                        <div class="meal-nutrient">
                            <i class="fas fa-oil-can text-warning"></i>
                            <span><strong>${meal.fat}g</strong> F</span>
                        </div>
                    </div>
                    <div class="progress mt-2" style="height: 4px; background: #e2e8f0;">
                        <div class="progress-bar" style="width: ${(meal.protein * 4 / meal.calories * 100)}%; background: ${mealColor};"></div>
                        <div class="progress-bar" style="width: ${(meal.carbs * 4 / meal.calories * 100)}%; background: #06d6a0;"></div>
                        <div class="progress-bar" style="width: ${(meal.fat * 9 / meal.calories * 100)}%; background: #ffd166;"></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// HEALTH TOOL FUNCTIONS
// ============================================
function showBMICalculator() {
    const bmiResult = document.getElementById('bmiResult');
    if (bmiResult && bmiResult.innerHTML) {
        bmiResult.classList.add('show');
        setTimeout(() => bmiResult.classList.remove('show'), 5000);
    } else {
        calculateNutrition();
    }
}

function showWaterCalculator() {
    const waterResult = document.getElementById('waterResult');
    if (waterResult && waterResult.innerHTML) {
        waterResult.classList.add('show');
        setTimeout(() => waterResult.classList.remove('show'), 5000);
    } else {
        calculateNutrition();
    }
}

function showSleepCalculator() {
    const sleepResult = document.getElementById('sleepResult');
    if (sleepResult && sleepResult.innerHTML) {
        sleepResult.classList.add('show');
        setTimeout(() => sleepResult.classList.remove('show'), 5000);
    } else {
        calculateNutrition();
    }
}

function showIdealWeight() {
    const weightResult = document.getElementById('weightResult');
    if (weightResult && weightResult.innerHTML) {
        weightResult.classList.add('show');
        setTimeout(() => weightResult.classList.remove('show'), 5000);
    } else {
        calculateNutrition();
    }
}

// ============================================
// FOOD IMAGE UPLOAD & PREDICTION
// ============================================
function handleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('preview');
        const imagePreview = document.getElementById('imagePreview');
        const uploadArea = document.getElementById('uploadArea');
        
        if (preview) preview.src = e.target.result;
        if (imagePreview) imagePreview.style.display = 'block';
        if (uploadArea) uploadArea.style.display = 'none';
        
        // Auto-predict after image is loaded
        setTimeout(() => predictFood(), 100);
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const imagePreview = document.getElementById('imagePreview');
    const fileInput = document.getElementById('foodImage');
    
    if (uploadArea) uploadArea.style.display = 'block';
    if (imagePreview) imagePreview.style.display = 'none';
    if (fileInput) fileInput.value = '';
    
    resetAnalysis();
}

function resetAnalysis() {
    const analysisResult = document.getElementById('analysisResult');
    if (analysisResult) {
        analysisResult.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-image fa-3x mb-2 opacity-50"></i>
                <p>Upload an image to identify your food</p>
            </div>
        `;
    }
}

function predictFood() {
    const fileInput = document.getElementById('foodImage');
    if (!fileInput) return;
    
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select an image first', true);
        return;
    }

    const formData = new FormData();
    formData.append('food_image', file);

    const analysisResult = document.getElementById('analysisResult');
    if (!analysisResult) return;
    
    // Show loading
    analysisResult.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-primary">Analyzing your food...</p>
        </div>
    `;

    fetch('/api/predict_image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // ── INVALID IMAGE: not a food photo ─────────────────────────────────
        if (!data.success && data.invalid) {
            analysisResult.innerHTML = `
                <div style="
                    background: #fff7ed;
                    border: 1.5px solid #fed7aa;
                    border-radius: 16px;
                    padding: 2rem 1.5rem;
                    text-align: center;
                ">
                    <div style="font-size: 3rem; margin-bottom: 0.75rem;">🚫</div>
                    <div style="
                        font-size: 1.15rem;
                        font-weight: 700;
                        color: #9a3412;
                        margin-bottom: 0.5rem;
                    ">Invalid Image</div>
                    <div style="
                        font-size: 0.95rem;
                        color: #c2410c;
                        margin-bottom: 1.25rem;
                        line-height: 1.5;
                    ">
                        This does not appear to be a food photo.<br>
                        Please upload a clear photo of a food dish.
                    </div>
                    <button
                        onclick="resetUpload()"
                        style="
                            background: #ea580c;
                            color: #fff;
                            border: none;
                            border-radius: 8px;
                            padding: 0.5rem 1.25rem;
                            font-size: 0.9rem;
                            font-weight: 600;
                            cursor: pointer;
                        "
                    >
                        📷 Try Another Image
                    </button>
                </div>
            `;
            return;
        }

        // ── GENERAL ERROR ────────────────────────────────────────────────────
        if (!data.success) {
            analysisResult.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error: ${data.error || 'Unknown error'}
                </div>
            `;
            return;
        }

        // ── SUCCESS: valid food prediction ───────────────────────────────────
        const pred = data.prediction;
        const baseCalPer100g = pred.calories;

        const catKey = pred.category.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        const recMap = {
            'low calorie':       { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', label: 'Low Calorie',       tips: ['Excellent for weight management — enjoy freely', 'Pair with a protein source for a complete meal', 'Great as a light snack between main meals', 'Supports steady energy without calorie overload'] },
            'moderate calorie':  { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: 'Moderate Calorie',  tips: ['Ideal for sustained energy throughout the day', 'Best consumed at lunch for optimal metabolism', 'Suitable for active individuals and athletes', 'Keep portions around 200–300g per serving'] },
            'high calorie':      { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: 'High Calorie',      tips: ['Best consumed post-workout for muscle recovery', 'Limit to one serving — avoid doubling up', 'Balance your plate with vegetables or salad', 'Avoid late-night consumption'] },
            'very high calorie': { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', label: 'Very High Calorie', tips: ['Treat as an occasional indulgence only', 'Recommended for high-intensity training days', 'Split into smaller portions across the day', 'Pair with high-fiber foods to slow digestion'] }
        };
        const rec = recMap[catKey] || recMap['moderate calorie'];

        // Detect liquid vs solid
        const liquidList = ['chai'];
        const solidList = ['burger', 'butter naan', 'chapati', 'chole bhature', 'dal makhani', 'dhokla', 'fried rice', 'idli', 'jalebi', 'kaathi rolls', 'kadai paneer', 'kulfi', 'masala dosa', 'momos', 'pani puri', 'pakode', 'pav bhaji', 'pizza', 'samosa'];
        const foodLower = pred.food.toLowerCase();
        const isLiquid = liquidList.some(l => foodLower.includes(l)) && !solidList.some(s => foodLower.includes(s));
        const unit = isLiquid ? 'ml' : 'g';
        const unitLabel = isLiquid ? 'per 100ml' : 'per 100g';

        analysisResult.innerHTML = `
            <div class="pred-card">

                <!-- Top accent bar -->
                <div class="pred-accent-bar" style="background: ${rec.color};"></div>

                <div class="pred-body">

                    <!-- Food name + badge row -->
                    <div class="pred-name-row">
                        <div>
                            <div class="pred-eyebrow">IDENTIFIED FOOD</div>
                            <b style="display:block; font-size:2.2rem; color:#0f172a; line-height:1.1; letter-spacing:-0.03em; word-break:break-word; font-family:'Inter',sans-serif;">${pred.food}</b>
                        </div>
                        <span class="pred-cal-badge" style="background:${rec.bg}; color:${rec.color}; border-color:${rec.border};">
                            ${rec.label}
                        </span>
                    </div>

                    <!-- Per-100 stat -->
                    <div class="pred-base-stat">
                        <span class="pred-base-num">${baseCalPer100g}</span>
                        <span class="pred-base-unit">kcal ${unitLabel}</span>
                    </div>

                    <!-- Serving input row -->
                    <div class="pred-gram-row">
                        <label class="pred-gram-label">Enter serving size</label>
                        <div class="pred-gram-input-wrap">
                            <input
                                type="number"
                                id="gramInput"
                                class="pred-gram-input"
                                value="100"
                                min="1"
                                max="2000"
                                oninput="recalcCalories(${baseCalPer100g}, '${unit}')"
                            />
                            <span class="pred-gram-unit">${unit}</span>
                        </div>
                        <div class="pred-gram-result" id="gramResult">
                            = <strong>${baseCalPer100g}</strong> kcal
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="pred-divider"></div>

                    <!-- Recommendations -->
                    <div class="pred-rec-title">Consumption Recommendations</div>
                    <ul class="pred-rec-list">
                        ${rec.tips.map(t => `<li><span class="pred-rec-dot" style="background:${rec.color};"></span>${t}</li>`).join('')}
                    </ul>

                </div>

                <!-- Footer -->
                <div class="pred-footer">
                    <i class="fas fa-circle-info" style="color:#94a3b8;"></i>
                    Calorie values are approximate and based on standard serving sizes
                </div>

            </div>
        `;
    })
    .catch(error => {
        console.error('Error:', error);
        analysisResult.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Failed to analyze image
            </div>
        `;
    });
}

function recalcCalories(basePer100, unit) {
    const amount = parseFloat(document.getElementById('gramInput')?.value) || 100;
    const total = Math.round((basePer100 / 100) * amount);
    const el = document.getElementById('gramResult');
    if (el) el.innerHTML = `= <strong>${total}</strong> kcal`;
}

function checkModelStatus() {
    fetch('/api/check_model')
        .then(response => response.json())
        .then(data => {
            let statusHtml = '<div class="alert alert-info">';
            statusHtml += `<h6>📊 System Status:</h6>`;
            statusHtml += `<p>Macro Model: ${data.macro_model ? '✅' : '❌'}</p>`;
            statusHtml += `<p>Calorie Model: ${data.calorie_model ? '✅' : '❌'}</p>`;
            statusHtml += `<p>Diet Model: ${data.diet_model ? '✅' : '❌'}</p>`;
            statusHtml += `<p>Image Model: ${data.image_model ? '✅' : '❌'}</p>`;
            statusHtml += `<p>Foods in Database: ${data.foods_count}</p>`;
            statusHtml += '</div>';
            
            const result = document.getElementById('analysisResult');
            if (result) {
                result.innerHTML = statusHtml;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to check model status');
        });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
