import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [packing, setPacking] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  
  // New ingredient form
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    cost_per_unit: '',
    quantity: '', // Added quantity field
    unit_type: '',
    vendor_id: '',
    box_count: '1' // Number of boxes - defaults to 1
  });

  // Unit conversion function
  const convertToOunces = (quantity, unit) => {
    const conversions = {
      'oz': 1,
      'lb': 16,
      'cup': 8, // Approximate - varies by ingredient, but 8 oz is standard for liquids
      'tbsp': 0.5,
      'tsp': 0.167,
      'g': 0.035274,
      'kg': 35.274
    };
    return quantity * (conversions[unit] || 1);
  };

  // Calculate cost for a recipe ingredient
  const calculateIngredientCost = (ingredient, quantity, unit) => {
    if (!ingredient || !quantity) return 0;
    
    // Convert the recipe quantity to ounces
    const recipeQuantityInOz = convertToOunces(parseFloat(quantity), unit);
    
    // Get the ingredient's base cost per unit
    let baseCostPerUnit = 0;
    if (ingredient.base_cost && ingredient.base_cost !== '0.00') {
      baseCostPerUnit = parseFloat(ingredient.base_cost);
    } else {
      const totalCost = ingredient.cost_per_unit || ingredient.price_per_unit || 0;
      const ingredientQuantity = ingredient.quantity || 1;
      baseCostPerUnit = totalCost / ingredientQuantity;
    }
    
    // Convert ingredient's unit to ounces to get cost per ounce
    const ingredientUnit = ingredient.unit_type || ingredient.unit || 'oz';
    const ingredientQuantityInOz = convertToOunces(1, ingredientUnit);
    const costPerOunce = baseCostPerUnit / ingredientQuantityInOz;
    
    // Calculate total cost
    return recipeQuantityInOz * costPerOunce;
  };

  // Add ingredient to recipe
  const handleAddIngredientToRecipe = () => {
    if (!recipeIngredient.ingredient_id || !recipeIngredient.quantity) {
      alert('Please select an ingredient and enter a quantity');
      return;
    }

    const selectedIngredient = ingredients.find(ing => ing.id === parseInt(recipeIngredient.ingredient_id));
    if (!selectedIngredient) {
      alert('Selected ingredient not found');
      return;
    }

    const cost = calculateIngredientCost(selectedIngredient, recipeIngredient.quantity, recipeIngredient.unit);
    
    // Find vendor name to display with ingredient
    const vendor = vendors.find(v => v.id === selectedIngredient.vendor_id);
    const displayName = vendor 
      ? `${selectedIngredient.name} (${vendor.name})`
      : `${selectedIngredient.name} (No vendor)`;
    
    const newRecipeIngredient = {
      ingredient_id: selectedIngredient.id,
      ingredient_name: displayName,
      quantity: parseFloat(recipeIngredient.quantity),
      unit: recipeIngredient.unit,
      cost: cost
    };

    setNewRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, newRecipeIngredient]
    }));

    // Reset the ingredient form
    setRecipeIngredient({
      ingredient_id: '',
      quantity: '',
      unit: 'oz'
    });
  };

  // Remove ingredient from recipe
  const handleRemoveIngredientFromRecipe = (index) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  // Add packaging to recipe
  const handleAddPackagingToRecipe = () => {
    if (!recipePackaging.packaging_id || !recipePackaging.quantity) {
      alert('Please select a packaging item and enter a quantity');
      return;
    }

    const selectedPackaging = packing.find(pkg => pkg.id === parseInt(recipePackaging.packaging_id));
    if (!selectedPackaging) {
      alert('Selected packaging not found');
      return;
    }

    const cost = parseFloat(selectedPackaging.price) * parseInt(recipePackaging.quantity);
    
    const newRecipePackaging = {
      packaging_id: selectedPackaging.id,
      packaging_name: selectedPackaging.name,
      quantity: parseInt(recipePackaging.quantity),
      cost: cost
    };

    setNewRecipe(prev => ({
      ...prev,
      packaging: [...prev.packaging, newRecipePackaging]
    }));

    // Reset the packaging form
    setRecipePackaging({
      packaging_id: '',
      quantity: 1
    });
  };

  // Remove packaging from recipe
  const handleRemovePackagingFromRecipe = (index) => {
    setNewRecipe(prev => ({
      ...prev,
      packaging: prev.packaging.filter((_, i) => i !== index)
    }));
  };

  // Calculate total recipe cost including packaging
  const calculateTotalRecipeCost = () => {
    const ingredientsCost = newRecipe.ingredients.reduce((total, ingredient) => total + ingredient.cost, 0);
    const packagingCost = newRecipe.packaging.reduce((total, pkg) => total + pkg.cost, 0);
    return ingredientsCost + packagingCost;
  };

  // New recipe form
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    servings: '',
    ingredients: [], // Array of {ingredient_id, quantity, unit, cost}
    packaging: [] // Array of {packaging_id, packaging_name, quantity, cost}
  });

  // Recipe ingredient form
  const [recipeIngredient, setRecipeIngredient] = useState({
    ingredient_id: '',
    quantity: '',
    unit: 'oz'
  });

  // Recipe packaging form
  const [recipePackaging, setRecipePackaging] = useState({
    packaging_id: '',
    quantity: 1
  });

  // New packing form
  const [newPacking, setNewPacking] = useState({
    name: '',
    price: ''
  });

  // New vendor form
  const [newVendor, setNewVendor] = useState({
    name: '',
    address: '',
    phone: ''
  });

  // Test backend connection
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        console.log('Checking backend health at: http://localhost:5000/api/health');
        const response = await fetch('http://localhost:5000/api/health', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        });
        const data = await response.json();
        console.log('Backend health response:', data);
        setHealthStatus(data);
      } catch (error) {
        console.error('Backend connection failed:', error);
        setHealthStatus({ 
          status: 'ERROR', 
          message: `Backend not available: ${error.message}. Check CORS settings or server status.` 
        });
      }
    };

    const fetchIngredients = async () => {
      try {
        console.log('Fetching ingredients from: http://localhost:5000/api/ingredients');
        const response = await fetch('http://localhost:5000/api/ingredients', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        });
        const data = await response.json();
        console.log('Ingredients response:', data);
        setIngredients(data);
      } catch (error) {
        console.error('Failed to fetch ingredients:', error);
      }
    };

    const fetchRecipes = async () => {
      try {
        console.log('Fetching recipes from: http://localhost:5000/api/recipes');
        const response = await fetch('http://localhost:5000/api/recipes', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        });
        const data = await response.json();
        console.log('Recipes response:', data);
        setRecipes(data);
      } catch (error) {
        console.error('Failed to fetch recipes:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchPacking = async () => {
      try {
        console.log('Fetching packing from: http://localhost:5000/api/packing');
        const response = await fetch('http://localhost:5000/api/packing', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        });
        const data = await response.json();
        console.log('Packing response:', data);
        setPacking(data);
      } catch (error) {
        console.error('Failed to fetch packing:', error);
      }
    };

    const fetchVendors = async () => {
      try {
        console.log('Fetching vendors from: http://localhost:5000/api/vendors');
        const response = await fetch('http://localhost:5000/api/vendors', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        });
        const data = await response.json();
        console.log('Vendors response:', data);
        setVendors(data);
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      }
    };

    checkBackendHealth();
    fetchIngredients();
    fetchRecipes();
    fetchPacking();
    fetchVendors();
  }, []);

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(newIngredient)
      });
      
      if (response.ok) {
        const addedIngredient = await response.json();
        setIngredients([...ingredients, addedIngredient]);
        setNewIngredient({ 
          name: '', 
          cost_per_unit: '', 
          quantity: '', 
          unit_type: '',
          vendor_id: '',
          box_count: '1'
        });
        alert('Ingredient added successfully!');
      } else {
        const error = await response.json();
        alert('Error adding ingredient: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
      alert('Error adding ingredient: ' + error.message);
    }
  };

  const handleAddRecipe = async (e) => {
    e.preventDefault();
    
    console.log('Creating recipe with data:', {
      ...newRecipe,
      total_recipe_cost: calculateTotalRecipeCost().toFixed(2),
      cost_per_serving: newRecipe.servings ? (calculateTotalRecipeCost() / parseFloat(newRecipe.servings)).toFixed(2) : '0.00'
    });
    
    const totalCost = calculateTotalRecipeCost();
    const costPerServing = newRecipe.servings ? (totalCost / parseFloat(newRecipe.servings)).toFixed(2) : '0.00';
    
    const recipeData = {
      name: newRecipe.name,
      servings: parseInt(newRecipe.servings),
      total_recipe_cost: totalCost.toFixed(2),
      cost_per_serving: costPerServing,
      recipe_ingredients: newRecipe.ingredients || [],
      recipe_packaging: newRecipe.packaging.map(pkg => ({
        packaging_id: pkg.packaging_id,
        quantity: pkg.quantity
      })) || []
    };

    console.log('Final recipe data being sent:', recipeData);
    
    try {
      const response = await fetch('http://localhost:5000/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(recipeData)
      });
      
      if (response.ok) {
        const addedRecipe = await response.json();
        setRecipes([...recipes, addedRecipe]);
        setNewRecipe({ 
          name: '', 
          servings: '', 
          ingredients: [],
          packaging: []
        });
        alert('Recipe added successfully!');
      } else {
        const error = await response.json();
        console.error('Recipe creation error:', error);
        alert('Error adding recipe: ' + (error.message || error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding recipe:', error);
      alert('Error adding recipe: ' + error.message);
    }
  };

  const handleDeleteIngredient = async (ingredientId) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/ingredients/${ingredientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      if (response.ok) {
        // Remove from local state
        setIngredients(ingredients.filter(ingredient => ingredient.id !== ingredientId));
        alert('Ingredient deleted successfully!');
      } else {
        const error = await response.json();
        alert('Error deleting ingredient: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      alert('Error deleting ingredient: ' + error.message);
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      if (response.ok) {
        // Remove from local state
        setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
        alert('Recipe deleted successfully!');
      } else {
        const error = await response.json();
        alert('Error deleting recipe: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Error deleting recipe: ' + error.message);
    }
  };

  // Packing functions
  const handleAddPacking = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/packing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(newPacking)
      });
      
      if (response.ok) {
        const addedPacking = await response.json();
        setPacking([...packing, addedPacking]);
        setNewPacking({ name: '', price: '' });
        alert('Packing item added successfully!');
      } else {
        const error = await response.json();
        alert('Error adding packing item: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding packing item:', error);
      alert('Error adding packing item: ' + error.message);
    }
  };

  const handleDeletePacking = async (packingId) => {
    if (!window.confirm('Are you sure you want to delete this packing item?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/packing/${packingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      if (response.ok) {
        // Remove from local state
        setPacking(packing.filter(item => item.id !== packingId));
        alert('Packing item deleted successfully!');
      } else {
        const error = await response.json();
        alert('Error deleting packing item: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting packing item:', error);
      alert('Error deleting packing item: ' + error.message);
    }
  };

  // Vendor management functions
  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(newVendor)
      });
      
      if (response.ok) {
        const addedVendor = await response.json();
        setVendors([...vendors, addedVendor]);
        setNewVendor({ name: '', address: '', phone: '' });
        alert('Vendor added successfully!');
      } else {
        const error = await response.json();
        alert('Error adding vendor: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding vendor:', error);
      alert('Error adding vendor: ' + error.message);
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      if (response.ok) {
        // Remove from local state
        setVendors(vendors.filter(vendor => vendor.id !== vendorId));
        alert('Vendor deleted successfully!');
      } else {
        const error = await response.json();
        alert('Error deleting vendor: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Error deleting vendor: ' + error.message);
    }
  };

  // Fetch reports data
  const fetchReportsData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reports/dashboard');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setReportsData(data);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      alert('Error fetching reports data: ' + error.message);
    }
  };

  // Load reports data when tab is selected
  useEffect(() => {
    if (activeTab === 'reports' && !reportsData) {
      fetchReportsData();
    }
  }, [activeTab, reportsData]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5', // Light grey background
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px' 
      }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            color: '#2c2c2c', // Dark grey for high contrast
            marginBottom: '10px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            🍳 Lean Kitchen Recipe Cost Calculator
          </h1>
          
          {/* Backend Status */}
          <div style={{ marginBottom: '30px' }}>
            {healthStatus ? (
              <div style={{ 
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: healthStatus.status === 'OK' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${healthStatus.status === 'OK' ? '#c3e6cb' : '#f5c6cb'}`,
                color: healthStatus.status === 'OK' ? '#155724' : '#721c24',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {healthStatus.status === 'OK' ? '✅' : '❌'} Backend: {healthStatus.status} - {healthStatus.message}
              </div>
            ) : (
              <div style={{ 
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                color: '#856404',
                fontSize: '14px'
              }}>
                🔄 Checking backend...
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div style={{ marginBottom: '40px' }}>
            <button 
              onClick={() => setActiveTab('reports')}
              style={{ 
                padding: '12px 24px', 
                margin: '0 8px', 
                backgroundColor: activeTab === 'reports' ? '#8A2BE2' : '#ffffff', // Blue violet when active
                color: activeTab === 'reports' ? 'white' : '#4a4a4a', // White text when active, dark grey when inactive
                border: activeTab === 'reports' ? '2px solid #8A2BE2' : '2px solid #d3d3d3', // Purple border when active
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === 'reports' ? '0 4px 12px rgba(138, 43, 226, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📊 Business Reports
            </button>
            <button 
              onClick={() => setActiveTab('recipes')}
              style={{ 
                padding: '12px 24px', 
                margin: '0 8px', 
                backgroundColor: activeTab === 'recipes' ? '#228B22' : '#ffffff', // Forest green when active
                color: activeTab === 'recipes' ? 'white' : '#4a4a4a', // White text when active, dark grey when inactive
                border: activeTab === 'recipes' ? '2px solid #228B22' : '2px solid #d3d3d3', // Green border when active
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === 'recipes' ? '0 4px 12px rgba(34, 139, 34, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📝 Recipe Builder
            </button>
            <button 
              onClick={() => setActiveTab('ingredients')}
              style={{ 
                padding: '12px 24px', 
                margin: '0 8px', 
                backgroundColor: activeTab === 'ingredients' ? '#DAA520' : '#ffffff', // Gold when active
                color: activeTab === 'ingredients' ? 'white' : '#4a4a4a', // White text when active, dark grey when inactive
                border: activeTab === 'ingredients' ? '2px solid #DAA520' : '2px solid #d3d3d3', // Gold border when active
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === 'ingredients' ? '0 4px 12px rgba(218, 165, 32, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              🧱 Ingredient Database
            </button>
            <button 
              onClick={() => setActiveTab('packing')}
              style={{ 
                padding: '12px 24px', 
                margin: '0 8px', 
                backgroundColor: activeTab === 'packing' ? '#8B4513' : '#ffffff', // Saddle brown when active
                color: activeTab === 'packing' ? 'white' : '#4a4a4a', // White text when active, dark grey when inactive
                border: activeTab === 'packing' ? '2px solid #8B4513' : '2px solid #d3d3d3', // Brown border when active
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === 'packing' ? '0 4px 12px rgba(139, 69, 19, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📦 Packing Database
            </button>
            <button 
              onClick={() => setActiveTab('vendors')}
              style={{ 
                padding: '12px 24px', 
                margin: '0 8px', 
                backgroundColor: activeTab === 'vendors' ? '#4169E1' : '#ffffff', // Royal blue when active
                color: activeTab === 'vendors' ? 'white' : '#4a4a4a', // White text when active, dark grey when inactive
                border: activeTab === 'vendors' ? '2px solid #4169E1' : '2px solid #d3d3d3', // Blue border when active
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === 'vendors' ? '0 4px 12px rgba(65, 105, 225, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              🏪 Vendor Database
            </button>
          </div>
        </header>

        <div style={{ textAlign: 'left', maxWidth: '100%', width: '100%' }}>
          {activeTab === 'ingredients' && (
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#4a4a4a', // Dark grey instead of blue
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                🧱 Ingredient Database (Master List)
              </h2>
              
              {/* Add New Ingredient Form */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                padding: '30px', 
                borderRadius: '15px', 
                marginBottom: '30px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                border: '2px solid #DAA520' // Gold border
              }}>
                <h3 style={{ 
                  fontSize: '1.4rem', 
                  color: '#4a4a4a', // Dark grey text
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  ➕ Add New Ingredient
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#6c757d',
                  marginBottom: '20px',
                  fontStyle: 'italic'
                }}>
                  Example: 6 boxes of 3lb strawberries for $10.15 total → Total paid: $10.15, Qty per box: 3, Boxes: 6
                </p>
                <form onSubmit={handleAddIngredient}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', // Adjusted for 6 fields
                    gap: '15px', 
                    marginBottom: '20px' 
                  }}>
                    <input
                      type="text"
                      placeholder="Ingredient Name"
                      value={newIngredient.name}
                      onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                      required
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '2px solid #d3d3d3', // Light grey border
                        fontSize: '16px',
                        transition: 'border-color 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#DAA520'} // Gold focus
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Total amount paid for all boxes ($)"
                      value={newIngredient.cost_per_unit}
                      onChange={(e) => setNewIngredient({...newIngredient, cost_per_unit: e.target.value})}
                      required
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '2px solid #d3d3d3', // Light grey border
                        fontSize: '16px',
                        transition: 'border-color 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#DAA520'} // Gold focus
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Quantity (e.g., 3 for 3lb per box)"
                      value={newIngredient.quantity}
                      onChange={(e) => setNewIngredient({...newIngredient, quantity: e.target.value})}
                      required
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '2px solid #d3d3d3', // Light grey border
                        fontSize: '16px',
                        transition: 'border-color 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#DAA520'} // Gold focus
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />
                    <select
                      value={newIngredient.unit_type}
                      onChange={(e) => setNewIngredient({...newIngredient, unit_type: e.target.value})}
                      required
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '2px solid #d3d3d3', // Light grey border
                        fontSize: '16px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Unit</option>
                      <option value="oz">Ounces (oz)</option>
                      <option value="lb">Pounds (lb)</option>
                      <option value="cup">Cups</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Number of boxes purchased"
                      value={newIngredient.box_count}
                      onChange={(e) => setNewIngredient({...newIngredient, box_count: e.target.value})}
                      required
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '2px solid #d3d3d3', // Light grey border
                        fontSize: '16px',
                        transition: 'border-color 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#DAA520'} // Gold focus
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />
                    <select
                      value={newIngredient.vendor_id}
                      onChange={(e) => setNewIngredient({...newIngredient, vendor_id: e.target.value})}
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '2px solid #d3d3d3',
                        fontSize: '16px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Vendor (Optional)</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" style={{ 
                    padding: '12px 30px', 
                    backgroundColor: '#DAA520', // Gold background
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '25px', 
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3)', // Gold shadow
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(218, 165, 32, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(218, 165, 32, 0.3)';
                  }}>
                    ✨ Add Ingredient
                  </button>
                </form>
              </div>

              {/* Ingredients List */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                padding: '30px', 
                borderRadius: '15px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                border: '2px solid #d3d3d3' // Light grey border
              }}>
                <h3 style={{ 
                  fontSize: '1.4rem', 
                  color: '#4a4a4a', // Dark grey text
                  marginBottom: '25px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  📋 Current Ingredients ({ingredients.length})
                </h3>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
                    Loading ingredients...
                  </div>
                ) : ingredients.length > 0 ? (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {/* Header Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr 1.5fr auto',
                      gap: '10px',
                      padding: '15px 20px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#4a4a4a',
                      border: '2px solid #d3d3d3'
                    }}>
                      <div>INGREDIENT NAME</div>
                      <div style={{ textAlign: 'center' }}>Total Paid</div>
                      <div style={{ textAlign: 'center' }}>Base Cost</div>
                      <div style={{ textAlign: 'center' }}>QTY</div>
                      <div style={{ textAlign: 'center' }}>UNIT TYPE</div>
                      <div style={{ textAlign: 'center' }}>BOXES</div>
                      <div style={{ textAlign: 'center' }}>VENDOR</div>
                      <div style={{ textAlign: 'center' }}>ACTION</div>
                    </div>
                    {ingredients.map((ingredient, index) => (
                      <div key={index} style={{ 
                        backgroundColor: '#ffffff', // Pure white background
                        padding: '20px', 
                        borderRadius: '12px',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr 1.5fr auto',
                        gap: '10px', // Reduced gap for better fit with more columns
                        alignItems: 'center',
                        border: '2px solid #DAA520', // Gold border for ingredient items
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(218, 165, 32, 0.2)'; // Gold shadow
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                        <div>
                          <strong style={{ fontSize: '18px', color: '#4a4a4a' }}>{ingredient.name}</strong> {/* Dark grey text */}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ 
                            color: '#B22222', // Red for total paid
                            fontWeight: 'bold', 
                            fontSize: '16px',
                            backgroundColor: '#fff0f0', // Very light red background
                            padding: '5px 10px',
                            borderRadius: '15px'
                          }}>
                            ${parseFloat(ingredient.cost_per_unit || 0).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ 
                            color: '#228B22', // Green for cost per unit
                            fontWeight: 'bold', 
                            fontSize: '16px',
                            backgroundColor: '#f0fff0', // Very light green background
                            padding: '5px 10px',
                            borderRadius: '15px'
                          }}>
                            ${parseFloat(ingredient.base_cost || 0).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ 
                            color: '#DAA520', // Gold for quantity
                            fontWeight: 'bold', 
                            fontSize: '16px',
                            backgroundColor: '#fffdf0', // Light background
                            padding: '5px 10px',
                            borderRadius: '15px'
                          }}>
                            {ingredient.quantity || '0'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ 
                            color: '#4a4a4a', // Dark grey for unit
                            backgroundColor: '#f5f5f5', // Light grey background
                            padding: '5px 10px',
                            borderRadius: '15px',
                            fontSize: '14px'
                          }}>
                            {ingredient.unit_type || ingredient.unit}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ 
                            color: '#8B4513', // Brown for box count
                            backgroundColor: '#faf3e0', // Light brown background
                            padding: '5px 10px',
                            borderRadius: '15px',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            {ingredient.box_count || 1}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ 
                            color: '#6f42c1', // Purple for vendor
                            backgroundColor: '#f8f9fa', // Light background
                            padding: '5px 10px',
                            borderRadius: '15px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>
                            {(() => {
                              const vendor = vendors.find(v => v.id === ingredient.vendor_id);
                              if (vendor) {
                                return <div>{vendor.name}</div>;
                              }
                              return 'No vendor';
                            })()}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card hover effects
                              handleDeleteIngredient(ingredient.id);
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#dc3545', // Red background
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'background-color 0.2s ease',
                              boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#c82333';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#dc3545';
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#4a4a4a', // Dark grey text
                    backgroundColor: '#ffffff', // White background
                    borderRadius: '12px',
                    border: '2px dashed #DAA520' // Gold dashed border
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>🥘</div>
                    <p style={{ fontSize: '18px', margin: '0' }}>No ingredients found. Add some ingredients to get started!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'recipes' && (
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#4a4a4a', // Dark grey
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                📝 Recipe Builder
              </h2>
              
              {/* Add New Recipe Form */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                padding: '30px', 
                borderRadius: '15px', 
                marginBottom: '30px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                border: '2px solid #228B22' // Green border for recipes
              }}>
                <h3 style={{ 
                  fontSize: '1.4rem', 
                  color: '#4a4a4a', // Dark grey text
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  ➕ Create New Recipe
                </h3>
                <form onSubmit={handleAddRecipe}>
                  <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                    <input
                      type="text"
                      placeholder="Recipe Name"
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                      required
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '2px solid #d3d3d3', // Light grey border
                        fontSize: '16px',
                        transition: 'border-color 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#228B22'} // Green focus
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />
                    <input
                      type="number"
                      placeholder="Number of servings"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe({...newRecipe, servings: e.target.value})}
                      required
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '2px solid #d3d3d3', // Light grey border
                        fontSize: '16px',
                        transition: 'border-color 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#228B22'} // Green focus
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />

                    {/* Packaging Selection */}
                    <div style={{ 
                      padding: '25px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      border: '2px solid #8B4513'
                    }}>
                      <h4 style={{ 
                        fontSize: '1.2rem', 
                        color: '#4a4a4a', 
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        📦 Recipe Packaging (Optional)
                      </h4>

                      {/* Add Packaging Form */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr auto', 
                        gap: '15px', 
                        marginBottom: '20px',
                        alignItems: 'end'
                      }}>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: '600',
                            color: '#4a4a4a'
                          }}>Packaging Item</label>
                          <select
                            value={recipePackaging.packaging_id}
                            onChange={(e) => setRecipePackaging(prev => ({
                              ...prev,
                              packaging_id: e.target.value
                            }))}
                            style={{ 
                              padding: '12px 16px', 
                              borderRadius: '8px', 
                              border: '2px solid #d3d3d3',
                              fontSize: '16px',
                              transition: 'border-color 0.3s ease',
                              outline: 'none',
                              width: '100%',
                              backgroundColor: 'white'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#8B4513'}
                            onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                          >
                            <option value="">Select packaging...</option>
                            {packing.map((pkg) => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.name} - ${parseFloat(pkg.price).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: '600',
                            color: '#4a4a4a'
                          }}>Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={recipePackaging.quantity}
                            onChange={(e) => setRecipePackaging(prev => ({
                              ...prev,
                              quantity: e.target.value
                            }))}
                            style={{ 
                              padding: '12px 16px', 
                              borderRadius: '8px', 
                              border: '2px solid #d3d3d3',
                              fontSize: '16px',
                              transition: 'border-color 0.3s ease',
                              outline: 'none',
                              width: '100%',
                              backgroundColor: 'white'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#8B4513'}
                            onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddPackagingToRecipe}
                          style={{
                            padding: '12px 20px',
                            backgroundColor: '#8B4513',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '600',
                            transition: 'background-color 0.3s ease'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#654321'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#8B4513'}
                        >
                          Add Packaging
                        </button>
                      </div>

                      {/* Current Packaging in Recipe */}
                      {newRecipe.packaging.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                          <h5 style={{ 
                            fontSize: '1rem', 
                            color: '#4a4a4a', 
                            marginBottom: '15px' 
                          }}>
                            Added Packaging ({newRecipe.packaging.length})
                          </h5>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 1fr 1fr auto', 
                            gap: '10px', 
                            fontSize: '14px',
                            fontWeight: 'bold',
                            padding: '10px',
                            backgroundColor: '#8B4513',
                            color: 'white',
                            borderRadius: '8px 8px 0 0'
                          }}>
                            <div>PACKAGING</div>
                            <div style={{ textAlign: 'center' }}>QTY</div>
                            <div style={{ textAlign: 'center' }}>COST</div>
                            <div style={{ textAlign: 'center' }}>ACTION</div>
                          </div>
                          {newRecipe.packaging.map((pkg, index) => (
                            <div 
                              key={index}
                              style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '2fr 1fr 1fr auto', 
                                gap: '10px', 
                                padding: '12px 10px',
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f4f0',
                                borderLeft: '2px solid #8B4513',
                                borderRight: '2px solid #8B4513',
                                borderBottom: index === newRecipe.packaging.length - 1 ? '2px solid #8B4513' : '1px solid #e0e0e0',
                                fontSize: '14px',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ fontWeight: '500' }}>{pkg.packaging_name}</div>
                              <div style={{ textAlign: 'center' }}>{pkg.quantity}</div>
                              <div style={{ textAlign: 'center', color: '#8B4513', fontWeight: 'bold' }}>
                                ${pkg.cost.toFixed(2)}
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePackagingFromRecipe(index)}
                                  style={{
                                    padding: '6px 8px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recipe Ingredients Section */}
                    <div style={{ 
                      marginTop: '30px',
                      padding: '25px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      border: '2px solid #228B22'
                    }}>
                      <h4 style={{ 
                        fontSize: '1.2rem', 
                        color: '#4a4a4a', 
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        🥘 Recipe Ingredients
                      </h4>

                      {/* Add Ingredient Form */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1fr auto', 
                        gap: '15px', 
                        marginBottom: '20px',
                        alignItems: 'end'
                      }}>
                        <select
                          value={recipeIngredient.ingredient_id}
                          onChange={(e) => setRecipeIngredient({...recipeIngredient, ingredient_id: e.target.value})}
                          style={{ 
                            padding: '12px 16px', 
                            borderRadius: '8px', 
                            border: '2px solid #d3d3d3',
                            fontSize: '16px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="">Select Ingredient</option>
                          {ingredients.map(ingredient => {
                            const vendorName = vendors.find(v => v.id === ingredient.vendor_id)?.name;
                            const displayName = vendorName 
                              ? `${ingredient.name} (${vendorName})`
                              : `${ingredient.name} (No vendor)`;
                            return (
                              <option key={ingredient.id} value={ingredient.id}>
                                {displayName}
                              </option>
                            );
                          })}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Quantity"
                          value={recipeIngredient.quantity}
                          onChange={(e) => setRecipeIngredient({...recipeIngredient, quantity: e.target.value})}
                          style={{ 
                            padding: '12px 16px', 
                            borderRadius: '8px', 
                            border: '2px solid #d3d3d3',
                            fontSize: '16px',
                            outline: 'none'
                          }}
                        />
                        <select
                          value={recipeIngredient.unit}
                          onChange={(e) => setRecipeIngredient({...recipeIngredient, unit: e.target.value})}
                          style={{ 
                            padding: '12px 16px', 
                            borderRadius: '8px', 
                            border: '2px solid #d3d3d3',
                            fontSize: '16px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="oz">Ounces (oz)</option>
                          <option value="lb">Pounds (lb)</option>
                          <option value="cup">Cups</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleAddIngredientToRecipe}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#DAA520',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          ➕ Add
                        </button>
                      </div>

                      {/* Recipe Ingredients List */}
                      {newRecipe.ingredients.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                            gap: '10px',
                            padding: '10px 15px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '12px',
                            color: '#4a4a4a',
                            marginBottom: '10px'
                          }}>
                            <div>INGREDIENT</div>
                            <div style={{ textAlign: 'center' }}>QUANTITY</div>
                            <div style={{ textAlign: 'center' }}>UNIT</div>
                            <div style={{ textAlign: 'center' }}>COST</div>
                            <div style={{ textAlign: 'center' }}>ACTION</div>
                          </div>
                          {newRecipe.ingredients.map((ingredient, index) => (
                            <div key={index} style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                              gap: '10px',
                              padding: '12px 15px',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              border: '1px solid #dee2e6',
                              alignItems: 'center'
                            }}>
                              <div style={{ fontWeight: '500' }}>{ingredient.ingredient_name}</div>
                              <div style={{ textAlign: 'center' }}>{ingredient.quantity}</div>
                              <div style={{ textAlign: 'center' }}>{ingredient.unit}</div>
                              <div style={{ textAlign: 'center', color: '#228B22', fontWeight: 'bold' }}>
                                ${ingredient.cost.toFixed(2)}
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredientFromRecipe(index)}
                                  style={{
                                    padding: '6px 8px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                          <div style={{
                            padding: '15px',
                            backgroundColor: '#d4edda',
                            borderRadius: '8px',
                            border: '2px solid #228B22',
                            marginTop: '15px'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: '#155724'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                fontSize: '14px',
                                color: '#155724',
                                marginBottom: '5px'
                              }}>                              <span>Ingredients Cost:</span>
                              <span>${newRecipe.ingredients.reduce((total, ingredient) => total + ingredient.cost, 0).toFixed(2)}</span>
                            </div>
                            {newRecipe.packaging.length > 0 && (
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                fontSize: '14px',
                                color: '#8B4513',
                                marginBottom: '5px'
                              }}>
                                <span>Packaging Cost:</span>
                                <span>${newRecipe.packaging.reduce((total, pkg) => total + pkg.cost, 0).toFixed(2)}</span>
                              </div>
                            )}
                              <hr style={{ margin: '8px 0', border: '1px solid #228B22' }} />
                              <span>Total Recipe Cost:</span>
                              <span>${calculateTotalRecipeCost().toFixed(2)}</span>
                            </div>
                            {newRecipe.servings && (
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                fontSize: '14px',
                                marginTop: '8px',
                                color: '#155724'
                              }}>
                                <span>Cost Per Serving:</span>
                                <span>${(calculateTotalRecipeCost() / parseFloat(newRecipe.servings)).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="submit" style={{ 
                    padding: '12px 30px', 
                    backgroundColor: '#228B22', // Forest green
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '25px', 
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(34, 139, 34, 0.3)', // Green shadow
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(34, 139, 34, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(34, 139, 34, 0.3)';
                  }}>
                    🍳 Create Recipe
                  </button>
                </form>
              </div>

              {/* Recipes List */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                padding: '30px', 
                borderRadius: '15px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                border: '2px solid #d3d3d3' // Light grey border
              }}>
                <h3 style={{ 
                  fontSize: '1.4rem', 
                  color: '#4a4a4a', // Dark grey text
                  marginBottom: '25px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  📚 Current Recipes ({recipes.length})
                </h3>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
                    Loading recipes...
                  </div>
                ) : recipes.length > 0 ? (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {recipes.map((recipe, index) => (
                      <div key={index} style={{ 
                        backgroundColor: '#ffffff', // Pure white background
                        padding: '25px', 
                        borderRadius: '15px',
                        border: '2px solid #228B22', // Green border for recipe items
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 139, 34, 0.15)'; // Green shadow
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                        <h4 style={{ 
                          margin: '0 0 15px 0', 
                          color: '#4a4a4a', // Dark grey text
                          fontSize: '1.3rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between' // Space between title and delete button
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            🍽️ {recipe.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card hover effects
                              handleDeleteRecipe(recipe.id);
                            }}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#dc3545', // Red background
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'background-color 0.2s ease',
                              boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
                              marginLeft: '10px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#c82333';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#dc3545';
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </h4>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                          gap: '15px', 
                          marginBottom: '15px' 
                        }}>
                          <div style={{ 
                            backgroundColor: '#ffffff', 
                            padding: '12px', 
                            borderRadius: '8px',
                            textAlign: 'center',
                            border: '2px solid #d3d3d3' // Light grey border
                          }}>
                            <div style={{ fontSize: '12px', color: '#4a4a4a', marginBottom: '5px' }}>SERVINGS</div> {/* Dark grey text */}
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4a4a4a' }}>{recipe.servings}</div>
                          </div>
                          <div style={{ 
                            backgroundColor: '#f0fff0', // Very light green background
                            padding: '12px', 
                            borderRadius: '8px',
                            textAlign: 'center',
                            border: '2px solid #228B22' // Green border
                          }}>
                            <div style={{ fontSize: '12px', color: '#228B22', marginBottom: '5px' }}>TOTAL COST</div> {/* Green text */}
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#228B22' }}>${recipe.total_recipe_cost || '0.00'}</div>
                          </div>
                          <div style={{ 
                            backgroundColor: '#fffdf0', // Very light gold background
                            padding: '12px', 
                            borderRadius: '8px',
                            textAlign: 'center',
                            border: '2px solid #DAA520' // Gold border
                          }}>
                            <div style={{ fontSize: '12px', color: '#DAA520', marginBottom: '5px' }}>COST PER SERVING</div> {/* Gold text */}
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#DAA520' }}>${recipe.cost_per_serving || '0.00'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#4a4a4a', // Dark grey text
                    backgroundColor: '#ffffff', // White background
                    borderRadius: '12px',
                    border: '2px dashed #228B22' // Green dashed border for recipes
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>📝</div>
                    <p style={{ fontSize: '18px', margin: '0' }}>No recipes found. Create your first recipe to get started!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'packing' && (
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#4a4a4a', // Dark grey instead of blue
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                📦 Packing Database
              </h2>
              
              {/* Add New Packing Item Form */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                padding: '30px', 
                borderRadius: '15px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                marginBottom: '40px',
                border: '2px solid #8B4513' // Brown border for packing
              }}>
                <h3 style={{ 
                  fontSize: '1.4rem', 
                  color: '#4a4a4a', // Dark grey
                  marginBottom: '25px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  ➕ Add New Packing Item
                </h3>
                
                <form onSubmit={handleAddPacking} style={{ display: 'grid', gap: '20px' }}>
                  <input
                    type="text"
                    placeholder="Packing item name (e.g., Small Box, Bubble Wrap)"
                    value={newPacking.name}
                    onChange={(e) => setNewPacking({...newPacking, name: e.target.value})}
                    required
                    style={{ 
                      padding: '12px 16px', 
                      borderRadius: '8px', 
                      border: '2px solid #d3d3d3', // Light grey border
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#8B4513'} // Brown focus
                    onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price ($)"
                    value={newPacking.price}
                    onChange={(e) => setNewPacking({...newPacking, price: e.target.value})}
                    required
                    style={{ 
                      padding: '12px 16px', 
                      borderRadius: '8px', 
                      border: '2px solid #d3d3d3', // Light grey border
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#8B4513'} // Brown focus
                    onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                  />
                  <button 
                    type="submit"
                    style={{ 
                      padding: '15px 30px', 
                      backgroundColor: '#8B4513', // Saddle brown
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(139, 69, 19, 0.3)'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#A0522D'} // Sienna on hover
                    onMouseOut={(e) => e.target.style.backgroundColor = '#8B4513'}
                  >
                    ➕ Add Packing Item
                  </button>
                </form>
              </div>

              {/* Packing Items List */}
              <div>
                <h3 style={{ 
                  fontSize: '1.4rem', 
                  color: '#4a4a4a', // Dark grey
                  marginBottom: '25px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  📦 All Packing Items ({packing.length})
                </h3>
                
                {packing.length > 0 ? (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {packing.map((item) => (
                      <div 
                        key={item.id} 
                        style={{ 
                          backgroundColor: '#ffffff', 
                          padding: '20px', 
                          borderRadius: '12px', 
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          border: '2px solid #f0f0f0',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 69, 19, 0.1)';
                          e.currentTarget.style.borderColor = '#8B4513';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                          e.currentTarget.style.borderColor = '#f0f0f0';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                            <div style={{ 
                              fontSize: '24px',
                              padding: '8px',
                              backgroundColor: '#8B4513',
                              borderRadius: '8px',
                              color: 'white'
                            }}>
                              📦
                            </div>
                            <div>
                              <div style={{ 
                                fontSize: '18px', 
                                fontWeight: '600', 
                                color: '#4a4a4a',
                                marginBottom: '4px'
                              }}>
                                {item.name}
                              </div>
                              <div style={{ 
                                fontSize: '16px', 
                                color: '#8B4513',
                                fontWeight: '600'
                              }}>
                                ${parseFloat(item.price).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => handleDeletePacking(item.id)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#4a4a4a', // Dark grey text
                    backgroundColor: '#ffffff', // White background
                    borderRadius: '12px',
                    border: '2px dashed #8B4513' // Brown dashed border for packing
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦</div>
                    <p style={{ fontSize: '18px', margin: '0' }}>No packing items found. Add your first packing item to get started!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#4a4a4a', // Dark grey instead of blue
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                🏢 Vendor Management
              </h2>
              
              {/* Add New Vendor Form */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                padding: '30px',
                borderRadius: '15px',
                marginBottom: '30px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                border: '2px solid #4169E1' // Blue border for vendor form
              }}>
                <h3 style={{ 
                  color: '#4169E1', // Royal blue color
                  marginBottom: '25px',
                  fontSize: '1.3rem',
                  textAlign: 'center'
                }}>
                  ➕ Add New Vendor
                </h3>
                
                <form onSubmit={handleAddVendor}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#4a4a4a', fontWeight: '600' }}>
                      Vendor Name <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newVendor.name}
                      onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                      placeholder="Enter vendor name..."
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid #d3d3d3',
                        fontSize: '16px',
                        transition: 'border-color 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#4a4a4a', fontWeight: '600' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={newVendor.phone}
                      onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid #d3d3d3',
                        fontSize: '16px',
                        transition: 'border-color 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#4a4a4a', fontWeight: '600' }}>
                      Address
                    </label>
                    <input
                      type="text"
                      value={newVendor.address}
                      onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                      placeholder="123 Business St, City, State 12345"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid #d3d3d3',
                        fontSize: '16px',
                        transition: 'border-color 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                      onBlur={(e) => e.target.style.borderColor = '#d3d3d3'}
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '15px',
                    backgroundColor: '#4169E1', // Royal blue background
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease, transform 0.1s ease',
                    boxShadow: '0 4px 12px rgba(65, 105, 225, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#365ed6';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#4169E1';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  🏢 Add Vendor
                </button>
                </form>
              </div>

              {/* Vendors List */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                padding: '30px',
                borderRadius: '15px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                border: '2px solid #4169E1' // Blue border for vendors list
              }}>
                <h3 style={{ 
                  color: '#4169E1', // Royal blue color
                  marginBottom: '25px',
                  fontSize: '1.3rem',
                  textAlign: 'center'
                }}>
                  📋 Vendor List ({vendors.length})
                </h3>
                
                {vendors.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#4a4a4a', // Dark grey text
                    backgroundColor: '#ffffff', // White background
                    borderRadius: '12px',
                    border: '2px dashed #4169E1' // Blue dashed border for vendors
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏢</div>
                    <p style={{ fontSize: '18px', margin: '0' }}>No vendors found. Add your first vendor to get started!</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {/* Header Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 2fr auto',
                      gap: '15px',
                      padding: '15px 20px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#4a4a4a',
                      border: '2px solid #d3d3d3'
                    }}>
                      <div>VENDOR NAME</div>
                      <div style={{ textAlign: 'center' }}>PHONE</div>
                      <div style={{ textAlign: 'center' }}>ADDRESS</div>
                      <div style={{ textAlign: 'center' }}>ACTION</div>
                    </div>
                    {vendors.map((vendor, index) => (
                      <div key={index} style={{ 
                        backgroundColor: '#ffffff', // Pure white background
                        padding: '20px', 
                        borderRadius: '12px',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 2fr auto',
                        gap: '15px',
                        alignItems: 'center',
                        border: '2px solid #4169E1', // Blue border for vendor items
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(65, 105, 225, 0.2)'; // Blue shadow
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                        <div>
                          <strong style={{ fontSize: '18px', color: '#4a4a4a' }}>{vendor.name}</strong>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          {vendor.phone ? (
                            <span style={{ fontSize: '14px', color: '#4a4a4a' }}>{vendor.phone}</span>
                          ) : (
                            <span style={{ color: '#6c757d', fontSize: '14px' }}>No phone</span>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          {vendor.address ? (
                            <span style={{ fontSize: '14px', color: '#4a4a4a' }}>{vendor.address}</span>
                          ) : (
                            <span style={{ color: '#6c757d', fontSize: '14px' }}>No address</span>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVendor(vendor.id);
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'background-color 0.2s ease',
                              boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#c82333';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#dc3545';
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#4a4a4a',
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                📊 Business Reports Dashboard
              </h2>

              {reportsData ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  {/* Summary Cards */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '15px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '2px solid #8A2BE2'
                  }}>
                    <h3 style={{ color: '#8A2BE2', marginBottom: '15px' }}>📈 Summary</h3>
                    <p><strong>Total Recipes:</strong> {reportsData.recipe_statistics?.total_recipes || 0}</p>
                    <p><strong>Avg Recipe Cost:</strong> ${parseFloat(reportsData.recipe_statistics?.avg_recipe_cost || 0).toFixed(2)}</p>
                    <p><strong>Highest Cost:</strong> ${parseFloat(reportsData.recipe_statistics?.highest_recipe_cost || 0).toFixed(2)}</p>
                    <p><strong>Lowest Cost:</strong> ${parseFloat(reportsData.recipe_statistics?.lowest_recipe_cost || 0).toFixed(2)}</p>
                  </div>

                  {/* Highest Cost Recipes */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '15px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '2px solid #dc3545'
                  }}>
                    <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>💰 Highest Cost Recipes</h3>
                    {reportsData.highest_cost_recipes && reportsData.highest_cost_recipes.length > 0 ? (
                      reportsData.highest_cost_recipes.map((recipe, index) => (
                        <div key={recipe.name || index} style={{ marginBottom: '10px' }}>
                          <strong>{index + 1}. {recipe.name}</strong>
                          <br />
                          <span style={{ color: '#666' }}>Cost: ${parseFloat(recipe.total_recipe_cost || 0).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p>No recipe data available</p>
                    )}
                  </div>

                  {/* Most Profitable Recipes */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '15px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '2px solid #28a745'
                  }}>
                    <h3 style={{ color: '#28a745', marginBottom: '15px' }}>🏆 Most Profitable Recipes</h3>
                    {reportsData.most_profitable_recipes && reportsData.most_profitable_recipes.length > 0 ? (
                      reportsData.most_profitable_recipes.map((recipe, index) => (
                        <div key={recipe.name || index} style={{ marginBottom: '10px' }}>
                          <strong>{index + 1}. {recipe.name}</strong>
                          <br />
                          <span style={{ color: '#666' }}>
                            Profit Margin: {parseFloat(recipe.profit_margin_percent || 0).toFixed(2)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>No profitability data available</p>
                    )}
                  </div>

                  {/* Weekly Analysis */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '15px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '2px solid #17a2b8'
                  }}>
                    <h3 style={{ color: '#17a2b8', marginBottom: '15px' }}>📅 Weekly Analysis</h3>
                    {reportsData.weekly_analysis && reportsData.weekly_analysis.length > 0 ? (
                      reportsData.weekly_analysis.map((week, index) => (
                        <div key={index} style={{ marginBottom: '10px' }}>
                          <p><strong>Recipes Created:</strong> {week.recipes_created}</p>
                          <p><strong>Total Cost:</strong> ${parseFloat(week.total_cost || 0).toFixed(2)}</p>
                          <p><strong>Est. Revenue:</strong> ${parseFloat(week.estimated_revenue || 0).toFixed(2)}</p>
                          <p><strong>Est. Profit:</strong> ${parseFloat(week.estimated_profit || 0).toFixed(2)}</p>
                        </div>
                      ))
                    ) : (
                      <p>No weekly data available</p>
                    )}
                  </div>

                  {/* Recipe Metrics */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '15px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '2px solid #ffc107'
                  }}>
                    <h3 style={{ color: '#e68900', marginBottom: '15px' }}>� Profit Metrics</h3>
                    <p><strong>Avg Profit Margin:</strong> {parseFloat(reportsData.average_profit_margin?.avg_profit_margin_percent || 0).toFixed(2)}%</p>
                    <p><strong>Total Cost (All):</strong> ${parseFloat(reportsData.recipe_statistics?.total_cost_all_recipes || 0).toFixed(2)}</p>
                  </div>

                  {/* Vendor Analysis */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '15px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '2px solid #6f42c1'
                  }}>
                    <h3 style={{ color: '#6f42c1', marginBottom: '15px' }}>🏪 Vendor Analysis</h3>
                    {reportsData.vendor_analysis && reportsData.vendor_analysis.length > 0 ? (
                      reportsData.vendor_analysis.map((vendor, index) => (
                        <div key={vendor.vendor_name || index} style={{ marginBottom: '10px' }}>
                          <strong>{vendor.vendor_name || 'No Vendor'}</strong>
                          <br />
                          <span style={{ color: '#666' }}>
                            Ingredients: {vendor.ingredient_count} | 
                            Avg Cost: ${parseFloat(vendor.avg_ingredient_cost || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>No vendor data available</p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#ffffff',
                  borderRadius: '15px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <p>Loading reports data...</p>
                  <button 
                    onClick={fetchReportsData}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#8A2BE2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginTop: '10px'
                    }}
                  >
                    Refresh Reports
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer style={{ 
          textAlign: 'center', 
          marginTop: '50px', 
          padding: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '2px solid #DAA520' // Gold border for footer
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#4a4a4a', // Dark grey text
            margin: '0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px'
          }}>
            <span>🔗 Backend: http://localhost:5000</span>
            <span>|</span>
            <span>🖥️ Frontend: http://localhost:5001</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
