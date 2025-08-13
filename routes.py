from flask import render_template, request, jsonify
from app import app, db
from models import Drone, Scenario
from conflict_detection import detect_conflicts, get_predefined_scenarios
import logging

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scenarios')
def get_scenarios():
    """Get all predefined scenarios"""
    try:
        scenarios = get_predefined_scenarios()
        return jsonify({'success': True, 'scenarios': scenarios})
    except Exception as e:
        logging.error(f"Error getting scenarios: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/load_scenario/<int:scenario_id>')
def load_scenario(scenario_id):
    """Load a predefined scenario"""
    try:
        # Clear existing drones
        Drone.query.delete()
        db.session.commit()
        
        scenarios = get_predefined_scenarios()
        scenario = next((s for s in scenarios if s['id'] == scenario_id), None)
        
        if not scenario:
            return jsonify({'success': False, 'error': 'Scenario not found'}), 404
        
        # Create drones for this scenario
        created_drones = []
        for drone_data in scenario['drones']:
            drone = Drone(
                name=drone_data['name'],
                start_x=drone_data['start']['x'],
                start_y=drone_data['start']['y'],
                start_z=drone_data['start']['z'],
                end_x=drone_data['end']['x'],
                end_y=drone_data['end']['y'],
                end_z=drone_data['end']['z'],
                speed=drone_data.get('speed', 1.0),
                is_primary=drone_data.get('is_primary', False),
                scenario_id=scenario_id
            )
            db.session.add(drone)
            created_drones.append(drone)
        
        db.session.commit()
        
        # Detect conflicts
        conflicts = detect_conflicts([d.to_dict() for d in created_drones])
        
        # Update conflict status
        for drone in created_drones:
            drone.has_conflict = drone.id in conflicts
        db.session.commit()
        
        drone_list = [drone.to_dict() for drone in created_drones]
        
        return jsonify({
            'success': True, 
            'scenario': scenario,
            'drones': drone_list,
            'conflicts': list(conflicts)
        })
        
    except Exception as e:
        logging.error(f"Error loading scenario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/drones')
def get_drones():
    """Get all drones"""
    try:
        drones = Drone.query.all()
        drone_list = [drone.to_dict() for drone in drones]
        
        # Detect conflicts
        conflicts = detect_conflicts(drone_list)
        
        return jsonify({
            'success': True, 
            'drones': drone_list,
            'conflicts': list(conflicts)
        })
    except Exception as e:
        logging.error(f"Error getting drones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/add_drone', methods=['POST'])
def add_drone():
    """Add a new drone"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'start', 'end']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        # Create new drone
        drone = Drone(
            name=data['name'],
            start_x=data['start']['x'],
            start_y=data['start']['y'],
            start_z=data['start']['z'],
            end_x=data['end']['x'],
            end_y=data['end']['y'],
            end_z=data['end']['z'],
            speed=data.get('speed', 1.0),
            is_primary=data.get('is_primary', False)
        )
        
        db.session.add(drone)
        db.session.commit()
        
        # Get all drones and detect conflicts
        all_drones = Drone.query.all()
        drone_list = [d.to_dict() for d in all_drones]
        conflicts = detect_conflicts(drone_list)
        
        # Update conflict status for all drones
        for d in all_drones:
            d.has_conflict = d.id in conflicts
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'drone': drone.to_dict(),
            'all_drones': [d.to_dict() for d in all_drones],
            'conflicts': list(conflicts)
        })
        
    except Exception as e:
        logging.error(f"Error adding drone: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clear_drones', methods=['POST'])
def clear_drones():
    """Clear all drones"""
    try:
        Drone.query.delete()
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error clearing drones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/detect_conflicts', methods=['POST'])
def api_detect_conflicts():
    """Detect conflicts for given drones"""
    try:
        data = request.get_json()
        drones = data.get('drones', [])
        
        conflicts = detect_conflicts(drones)
        
        return jsonify({
            'success': True,
            'conflicts': list(conflicts)
        })
        
    except Exception as e:
        logging.error(f"Error detecting conflicts: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update_drone/<int:drone_id>', methods=['PUT', 'POST'])
def update_drone(drone_id):
    """Update drone parameters"""
    try:
        data = request.get_json()
        
        drone = Drone.query.get(drone_id)
        if not drone:
            return jsonify({'success': False, 'error': 'Drone not found'}), 404
        
        # Update drone parameters
        if 'start' in data:
            drone.start_x = data['start']['x']
            drone.start_y = data['start']['y']
            drone.start_z = data['start']['z']
        
        if 'end' in data:
            drone.end_x = data['end']['x']
            drone.end_y = data['end']['y']
            drone.end_z = data['end']['z']
            
        # Handle individual coordinate updates for solution application
        if 'start_z' in data:
            drone.start_z = data['start_z']
        if 'end_z' in data:
            drone.end_z = data['end_z']
        if 'start_y' in data:
            drone.start_y = data['start_y']
        if 'end_y' in data:
            drone.end_y = data['end_y']
        
        if 'speed' in data:
            drone.speed = data['speed']
        
        db.session.commit()
        
        # Recalculate conflicts for all drones
        all_drones = Drone.query.all()
        drone_list = [d.to_dict() for d in all_drones]
        conflicts = detect_conflicts(drone_list)
        
        # Update conflict status
        for d in all_drones:
            d.has_conflict = d.id in conflicts
        db.session.commit()
        
        return jsonify({
            'success': True,
            'drone': drone.to_dict(),
            'all_drones': [d.to_dict() for d in all_drones],
            'conflicts': list(conflicts)
        })
        
    except Exception as e:
        logging.error(f"Error updating drone: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/remove_drone/<int:drone_id>', methods=['DELETE'])
def remove_drone(drone_id):
    """Remove a specific drone"""
    try:
        drone = Drone.query.get(drone_id)
        if not drone:
            return jsonify({'success': False, 'error': 'Drone not found'}), 404
        
        db.session.delete(drone)
        db.session.commit()
        
        # Recalculate conflicts for remaining drones
        remaining_drones = Drone.query.all()
        drone_list = [d.to_dict() for d in remaining_drones]
        conflicts = detect_conflicts(drone_list)
        
        # Update conflict status
        for d in remaining_drones:
            d.has_conflict = d.id in conflicts
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Drone removed successfully',
            'remaining_drones': drone_list,
            'conflicts': list(conflicts)
        })
        
    except Exception as e:
        logging.error(f"Error removing drone: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
