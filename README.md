# Lean Kitchen Recipe Cost Calculator

A full-stack web application for calculating recipe costs, including ingredients and packaging. Built for Lean Kitchen to help manage food costs and pricing.

## Features

- **Ingredient Management**: Add, edit, and delete ingredients with cost per unit calculations
- **Recipe Builder**: Create recipes with multiple ingredients and automatic cost calculation
- **Multiple Packaging Options**: Add multiple packaging items to recipes with cost tracking
- **Unit Conversion**: Support for various units (oz, lb, cup, tbsp, tsp, g, kg)
- **Cost Analysis**: Automatic calculation of total recipe cost and cost per serving
- **Database Integration**: PostgreSQL backend with full CRUD operations

## Tech Stack

- **Frontend**: React.js with modern CSS styling
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **API**: RESTful API design

## Project Structure

```
├── src/                    # React frontend
├── routes/                 # Express API routes
├── db/                     # Database configuration
├── public/                 # Static assets
├── server.js              # Express server entry point
└── package.json           # Dependencies and scripts
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd lkpc
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Set up the database:
```sql
CREATE DATABASE recipe_cost_calculator;
```

5. The application will create the necessary tables automatically on first run.

### Running the Application

1. Start the backend server:
```bash
node server.js
```

2. In a new terminal, start the React frontend:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

## API Endpoints

### Ingredients
- `GET /api/ingredients` - Get all ingredients
- `POST /api/ingredients` - Create new ingredient
- `PUT /api/ingredients/:id` - Update ingredient
- `DELETE /api/ingredients/:id` - Delete ingredient

### Recipes
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get recipe with full details
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Packaging
- `GET /api/packing` - Get all packaging items
- `POST /api/packing` - Create new packaging item
- `PUT /api/packing/:id` - Update packaging item
- `DELETE /api/packing/:id` - Delete packaging item

## Database Schema

### Tables
- `ingredients`: Ingredient data with costs and units
- `recipes`: Recipe basic information
- `recipe_ingredients`: Junction table for recipe-ingredient relationships
- `packing`: Packaging items and costs
- `recipe_packaging`: Junction table for recipe-packaging relationships

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary to Lean Kitchen.

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
