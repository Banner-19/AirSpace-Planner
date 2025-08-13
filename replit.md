# Overview

This is a comprehensive 3D Drone Flight Simulation System built with Flask that visualizes drone flight paths in a stunning web-based 3D environment. The application features advanced conflict detection, intelligent resolution algorithms, real-time collision detection, and a beautiful glass-morphism UI with sky background and atmospheric lighting. Users can create, manage, and simulate multiple drone trajectories with immediate collision detection and automated conflict resolution suggestions.

# User Preferences

Preferred communication style: Simple, everyday language.
Visual Design: Light theme with eye-pleasing colors using glass-morphism effects and blue gradients.
UI Behavior: Collapsible sidebar navigation with mutually exclusive accordion sections.
Footer: Copyright attribution to Bhaskar Banerjee.

# System Architecture

## Frontend Architecture
- **Advanced 3D Visualization**: Three.js r128 with realistic sky backgrounds, procedural clouds, and atmospheric lighting
- **Glass Morphism UI**: Modern translucent interface with backdrop blur effects and gradient animations
- **Real-time Collision Detection**: Immediate collision detection during simulation with automatic stop and alert
- **Modular JavaScript**: Separated into `DroneSimulator` class for logic and `ThreeScene` class for 3D rendering
- **Corner Axis System**: Full-length coordinate axes positioned at scene corners with color-coded labels
- **Intelligent Modal System**: Context-aware popups with conflict analysis and solution suggestions

## Backend Architecture
- **Flask Web Framework**: Lightweight Python web server handling API requests and template rendering
- **SQLAlchemy ORM**: Database abstraction layer using DeclarativeBase pattern
- **RESTful API Design**: Clean API endpoints for drone management, scenario loading, and conflict detection
- **Conflict Detection Engine**: Custom 3D geometry calculations for detecting drone path intersections

## Data Storage
- **SQLite Database**: Default local database for development with PostgreSQL support via environment configuration
- **Connection Pooling**: Configured with pool recycling and pre-ping for reliability
- **Two-Table Schema**: 
  - `Drone` table storing flight path coordinates, speed, and conflict status
  - `Scenario` table for predefined flight configurations

## Core Models
- **Drone Model**: Stores 3D coordinates (start/end points), speed parameters, and conflict flags
- **Scenario Model**: Groups drone configurations into reusable simulation setups
- **Conflict Detection**: Mathematical algorithms for 3D line segment distance calculations

## Application Flow
1. Users select predefined scenarios or create custom drone configurations in beautiful glass-morphism interface
2. System performs advanced 3D geometric conflict analysis with temporal sampling
3. Three.js renders real-time simulation with sky background, clouds, and immediate collision detection
4. Upon collision or completion, intelligent analysis modal provides detailed conflict information and solution suggestions
5. Users can select automated solutions for path adjustment, altitude changes, or timing modifications
6. Database persists all drone configurations with comprehensive README documentation

# External Dependencies

## Frontend Libraries
- **Three.js (r128)**: 3D graphics rendering and scene management
- **Bootstrap 5**: UI framework with dark theme support
- **Font Awesome 6**: Icon library for interface elements
- **OrbitControls**: Three.js camera control extension

## Backend Dependencies
- **Flask**: Core web framework
- **Flask-SQLAlchemy**: Database ORM integration
- **SQLAlchemy**: Database toolkit and ORM
- **Werkzeug**: WSGI utilities and proxy fix middleware
- **NumPy**: Mathematical computations for conflict detection algorithms

## Database Support
- **SQLite**: Default development database
- **PostgreSQL**: Production database support via DATABASE_URL environment variable

## Development Tools
- **Python Logging**: Debug-level logging configuration
- **Flask Debug Mode**: Development server with hot reloading
- **Proxy Fix Middleware**: Production deployment support for reverse proxies