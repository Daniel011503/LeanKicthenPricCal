# 🍳 Lean Kitchen Recipe Cost Calculator

A comprehensive web application for managing recipe costs, ingredient inventory, vendor relationships, and business profitability analysis for food businesses.

## ✨ Features

### 📊 Business Reports Dashboard
- **Real-time Analytics**: Auto-refreshing reports every 30 seconds
- **Weekly Analysis**: Cost vs revenue breakdown by week
- **Profitability Metrics**: Track profit margins and identify top-performing recipes
- **Vendor Analysis**: Monitor ingredient costs and supplier performance

### 📝 Recipe Management
- **Recipe Builder**: Create detailed recipes with ingredients and packaging
- **Cost Calculation**: Automatic cost-per-serving and total recipe cost calculation
- **Profit Analysis**: Real-time profit margin calculation with target pricing
- **Recipe Duplication**: Easily reuse existing recipes for different weeks
- **Weekly Organization**: Group recipes by production weeks

### 🧱 Ingredient Database
- **Master Inventory**: Comprehensive ingredient management with vendor tracking
- **Cost Tracking**: Track total cost, base cost per unit, and box quantities
- **Search & Filter**: Advanced search functionality across ingredients
- **Unit Conversion**: Support for multiple units (oz, lb, cups)
- **Vendor Integration**: Link ingredients to specific vendors

### 📦 Packaging Management
- **Packaging Database**: Manage packaging materials and costs
- **Recipe Integration**: Add packaging costs to recipe calculations
- **Cost Optimization**: Track packaging expenses per recipe

### 🏪 Vendor Management
- **Supplier Database**: Store vendor contact information and addresses
- **Cost Analysis**: Track average ingredient costs by vendor
- **Performance Metrics**: Analyze vendor relationships and spending

## 🚀 Tech Stack

### Frontend
- **React 19**: Modern React with hooks and functional components
- **CSS-in-JS**: Styled components with responsive design
- **Real-time Updates**: Auto-refreshing data with live updates

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Web application framework
- **PostgreSQL**: Relational database for data persistence
- **CORS**: Cross-origin resource sharing enabled

### Database
- **PostgreSQL 13+**: Primary database with advanced querying
- **Migration Support**: SQL migration files for database updates
- **Connection Pooling**: Efficient database connection management

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v13 or higher)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Daniel011503/LeanKitchenPricCal.git
cd LeanKitchenPricCal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Create PostgreSQL Database
```sql
CREATE DATABASE recipe_cost_calculator;
```

#### Set Up Environment Variables
Create a `.env` file in the root directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recipe_cost_calculator
DB_USER=postgres
DB_PASSWORD=your_password_here

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

#### Run Database Migrations
```bash
# Apply database schema migrations
node run_migration.js
```

### 4. Start the Application

#### Development Mode
```bash
# Start the backend server (runs on port 5000)
node server.js

# In a new terminal, start the React frontend (runs on port 3000)
npm start
```

#### Production Mode
```bash
# Build the React app
npm run build

# Start the production server
NODE_ENV=production node server.js
```

## 🎯 Usage Guide

### Getting Started
1. **Add Vendors**: Start by adding your suppliers in the Vendor Database
2. **Create Ingredients**: Add ingredients with costs, units, and vendor associations
3. **Build Recipes**: Create recipes using your ingredient database
4. **Add Packaging**: Include packaging costs in your recipes
5. **Analyze Reports**: Monitor your business performance through the reports dashboard

### Recipe Creation Workflow
1. Navigate to the **Recipe Builder** tab
2. Fill in recipe details (name, servings, week, selling price)
3. Add ingredients with quantities and units
4. Include packaging materials if needed
5. Review cost calculations and profit margins
6. Save the recipe

### Cost Analysis
- **Cost per Serving**: Automatically calculated based on ingredient quantities
- **Profit Margin**: Real-time calculation based on selling price
- **Target Pricing**: Get suggested prices for desired profit margins
- **Total Recipe Cost**: Complete cost for all servings including packaging

## 📱 API Endpoints

### Ingredients
- `GET /api/ingredients` - Get all ingredients
- `POST /api/ingredients` - Add new ingredient
- `DELETE /api/ingredients/:id` - Delete ingredient

### Recipes
- `GET /api/recipes` - Get all recipes
- `POST /api/recipes` - Create new recipe
- `POST /api/recipes/:id/duplicate` - Duplicate existing recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Reports
- `GET /api/reports/dashboard` - Get dashboard analytics
- `GET /api/reports/dashboard?week=YYYY-MM-DD` - Get week-specific reports

### Vendors & Packaging
- `GET /api/vendors` - Get all vendors
- `POST /api/vendors` - Add new vendor
- `GET /api/packing` - Get packaging items
- `POST /api/packing` - Add packaging item

## 🏗️ Project Structure

```
lkpc/
├── public/                 # Static assets
├── src/                    # React frontend source
│   ├── App.js             # Main application component
│   ├── IngredientsTab.js  # Ingredient management component
│   ├── RecipesTab.js      # Recipe builder component
│   ├── PackingTab.js      # Packaging management
│   ├── VendorsTab.js      # Vendor management
│   └── ReportsTab.js      # Analytics dashboard
├── routes/                # Express API routes
│   ├── ingredients.js     # Ingredient endpoints
│   ├── recipes.js         # Recipe endpoints
│   ├── reports.js         # Analytics endpoints
│   ├── vendors.js         # Vendor endpoints
│   └── packing.js         # Packaging endpoints
├── db/                    # Database configuration
│   ├── config.js          # Database connection setup
│   └── *.sql             # Migration files
├── server.js              # Express server entry point
├── package.json           # Dependencies and scripts
└── .env                   # Environment variables
```

## 🔧 Configuration

### Environment Variables
- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (development/production)
- `FRONTEND_URL`: Frontend URL for CORS

### Database Schema
The application automatically creates the following tables:
- `ingredients` - Ingredient master data
- `recipes` - Recipe information
- `recipe_ingredients` - Recipe-ingredient relationships
- `recipe_packaging` - Recipe-packaging relationships
- `vendors` - Supplier information
- `packing` - Packaging materials

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Verify database exists
psql -U postgres -l
```

#### Port Already in Use
```bash
# Kill process on port 5000
kill -9 $(lsof -ti:5000)

# Or change port in .env file
PORT=5001
```

#### CORS Issues
Ensure the `FRONTEND_URL` in `.env` matches your React app's URL.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Daniel011503**
- GitHub: [@Daniel011503](https://github.com/Daniel011503)
- Repository: [LeanKitchenPricCal](https://github.com/Daniel011503/LeanKitchenPricCal)

## 🙏 Acknowledgments

- Built with React and Node.js
- PostgreSQL for robust data management
- Express.js for RESTful API design
- Modern CSS-in-JS for responsive styling

---

**Happy Cooking! 🍳✨**
