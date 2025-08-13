import math
import numpy as np
from typing import List, Dict, Tuple, Set

def distance_3d(p1: Dict, p2: Dict) -> float:
    """Calculate 3D distance between two points"""
    return math.sqrt(
        (p1['x'] - p2['x'])**2 + 
        (p1['y'] - p2['y'])**2 + 
        (p1['z'] - p2['z'])**2
    )

def get_position_at_time(drone: Dict, t: float) -> Dict:
    """Get drone position at time t (0 to 1, where 1 is end of path)"""
    start = drone['start']
    end = drone['end']
    
    # Clamp t between 0 and 1
    t = max(0, min(1, t))
    
    return {
        'x': start['x'] + t * (end['x'] - start['x']),
        'y': start['y'] + t * (end['y'] - start['y']),
        'z': start['z'] + t * (end['z'] - start['z'])
    }

def get_path_duration(drone: Dict) -> float:
    """Get the duration for a drone to complete its path"""
    distance = distance_3d(drone['start'], drone['end'])
    speed = drone.get('speed', 1.0)
    return distance / speed if speed > 0 else float('inf')

def line_segment_distance(start1: Dict, end1: Dict, start2: Dict, end2: Dict) -> float:
    """Calculate minimum distance between two 3D line segments"""
    # Convert to numpy arrays for easier calculation
    p1 = np.array([start1['x'], start1['y'], start1['z']])
    p2 = np.array([end1['x'], end1['y'], end1['z']])
    p3 = np.array([start2['x'], start2['y'], start2['z']])
    p4 = np.array([end2['x'], end2['y'], end2['z']])
    
    # Direction vectors
    d1 = p2 - p1
    d2 = p4 - p3
    
    # Vector between start points
    w = p1 - p3
    
    # Parameters for closest points
    a = np.dot(d1, d1)
    b = np.dot(d1, d2)
    c = np.dot(d2, d2)
    d = np.dot(d1, w)
    e = np.dot(d2, w)
    
    denom = a * c - b * b
    
    if abs(denom) < 1e-10:  # Lines are parallel
        # Find closest points on parallel lines
        t1 = 0
        t2 = d / b if abs(b) > 1e-10 else 0
    else:
        t1 = (b * e - c * d) / denom
        t2 = (a * e - b * d) / denom
    
    # Clamp parameters to line segments
    t1 = max(0, min(1, t1))
    t2 = max(0, min(1, t2))
    
    # Calculate closest points
    closest1 = p1 + t1 * d1
    closest2 = p3 + t2 * d2
    
    return float(np.linalg.norm(closest1 - closest2))

def detect_conflicts(drones: List[Dict], conflict_threshold: float = 2.0, time_samples: int = 200) -> Set[int]:
    """
    Detect conflicts between drones based on their paths
    Returns set of drone IDs that have conflicts
    """
    conflicted_drones = set()
    
    if len(drones) < 2:
        return conflicted_drones
    
    # Check each pair of drones
    for i in range(len(drones)):
        for j in range(i + 1, len(drones)):
            drone1 = drones[i]
            drone2 = drones[j]
            
            # Get path durations
            duration1 = get_path_duration(drone1)
            duration2 = get_path_duration(drone2)
            
            # Always check temporal conflicts for crossing paths
            has_conflict = False
            
            # Sample positions over time with high precision
            for sample in range(time_samples + 1):
                t_global = sample / time_samples
                
                # Calculate actual positions based on individual drone progress
                # Each drone moves independently based on its own speed
                actual_time = t_global * max(duration1, duration2)
                
                # Calculate normalized time for each drone (how far they are in their individual journey)
                t1 = min(1.0, actual_time / duration1) if duration1 > 0 else 1.0
                t2 = min(1.0, actual_time / duration2) if duration2 > 0 else 1.0
                
                # Check for conflicts during active flight time
                if (t1 >= 0 and t1 <= 1) and (t2 >= 0 and t2 <= 1):
                    pos1 = get_position_at_time(drone1, t1)
                    pos2 = get_position_at_time(drone2, t2)
                    
                    distance = distance_3d(pos1, pos2)
                    
                    if distance < conflict_threshold:
                        has_conflict = True
                        break
            
            # Additional check: if paths physically intersect in space
            min_path_distance = line_segment_distance(
                drone1['start'], drone1['end'],
                drone2['start'], drone2['end']
            )
            
            # If paths come very close in space, check timing more carefully
            if min_path_distance < conflict_threshold * 1.5:
                # Find intersection point and check if drones will be there at same time
                intersection_conflict = check_intersection_timing(drone1, drone2, conflict_threshold)
                if intersection_conflict:
                    has_conflict = True
            
            if has_conflict:
                conflicted_drones.add(drone1.get('id', i))
                conflicted_drones.add(drone2.get('id', j))
    
    return conflicted_drones

def check_intersection_timing(drone1: Dict, drone2: Dict, threshold: float = 2.0) -> bool:
    """
    Check if two drones will be at intersection point at similar times
    """
    # Find the closest approach points on both paths
    start1, end1 = drone1['start'], drone1['end']
    start2, end2 = drone2['start'], drone2['end']
    
    # Calculate closest points between the two line segments
    p1 = np.array([start1['x'], start1['y'], start1['z']])
    p2 = np.array([end1['x'], end1['y'], end1['z']])
    p3 = np.array([start2['x'], start2['y'], start2['z']])
    p4 = np.array([end2['x'], end2['y'], end2['z']])
    
    d1 = p2 - p1
    d2 = p4 - p3
    w = p1 - p3
    
    a = np.dot(d1, d1)
    b = np.dot(d1, d2)
    c = np.dot(d2, d2)
    d = np.dot(d1, w)
    e = np.dot(d2, w)
    
    denom = a * c - b * b
    
    if abs(denom) < 1e-10:
        return False  # Parallel paths
    
    t1 = (b * e - c * d) / denom
    t2 = (a * e - b * d) / denom
    
    # Clamp to line segments
    t1 = max(0, min(1, t1))
    t2 = max(0, min(1, t2))
    
    # Get actual positions at these parameters
    pos1 = get_position_at_time(drone1, t1)
    pos2 = get_position_at_time(drone2, t2)
    
    spatial_distance = distance_3d(pos1, pos2)
    
    if spatial_distance > threshold:
        return False
    
    # Calculate time when each drone reaches this point
    duration1 = get_path_duration(drone1)
    duration2 = get_path_duration(drone2)
    
    time1 = t1 * duration1
    time2 = t2 * duration2
    
    # Check if they arrive at similar times (within 2 seconds)
    time_diff = abs(time1 - time2)
    return time_diff < 3.0

def get_predefined_scenarios() -> List[Dict]:
    """Get predefined scenarios for testing"""
    scenarios = [
        {
            'id': 1,
            'name': 'Conflict-Free Parallel Paths',
            'description': 'Multiple drones flying in parallel paths with safe distances',
            'has_conflicts': False,
            'drones': [
                {
                    'name': 'Primary Drone',
                    'start': {'x': 0, 'y': 0, 'z': 5},
                    'end': {'x': 20, 'y': 0, 'z': 5},
                    'speed': 1.0,
                    'is_primary': True
                },
                {
                    'name': 'Escort Drone 1',
                    'start': {'x': 0, 'y': 5, 'z': 5},
                    'end': {'x': 20, 'y': 5, 'z': 5},
                    'speed': 1.0,
                    'is_primary': False
                },
                {
                    'name': 'Escort Drone 2',
                    'start': {'x': 0, 'y': -5, 'z': 5},
                    'end': {'x': 20, 'y': -5, 'z': 5},
                    'speed': 1.0,
                    'is_primary': False
                }
            ]
        },
        {
            'id': 2,
            'name': 'Head-On Collision Course',
            'description': 'Two drones on collision course - high conflict scenario',
            'has_conflicts': True,
            'drones': [
                {
                    'name': 'Primary Drone',
                    'start': {'x': 0, 'y': 0, 'z': 5},
                    'end': {'x': 20, 'y': 0, 'z': 5},
                    'speed': 1.0,
                    'is_primary': True
                },
                {
                    'name': 'Incoming Drone',
                    'start': {'x': 20, 'y': 0, 'z': 5},
                    'end': {'x': 0, 'y': 0, 'z': 5},
                    'speed': 1.0,
                    'is_primary': False
                }
            ]
        },
        {
            'id': 3,
            'name': 'Crossing Paths',
            'description': 'Drones with intersecting flight paths at different times',
            'has_conflicts': True,
            'drones': [
                {
                    'name': 'Primary Drone',
                    'start': {'x': 0, 'y': 0, 'z': 5},
                    'end': {'x': 20, 'y': 0, 'z': 5},
                    'speed': 1.5,
                    'is_primary': True
                },
                {
                    'name': 'Crossing Drone 1',
                    'start': {'x': 10, 'y': -10, 'z': 5},
                    'end': {'x': 10, 'y': 10, 'z': 5},
                    'speed': 2.0,
                    'is_primary': False
                },
                {
                    'name': 'Crossing Drone 2',
                    'start': {'x': 15, 'y': 10, 'z': 3},
                    'end': {'x': 15, 'y': -10, 'z': 7},
                    'speed': 1.5,
                    'is_primary': False
                }
            ]
        },
        {
            'id': 4,
            'name': 'Multi-Level Safe Formation',
            'description': 'Complex formation with multiple altitude levels - conflict-free',
            'has_conflicts': False,
            'drones': [
                {
                    'name': 'Lead Drone',
                    'start': {'x': 0, 'y': 0, 'z': 8},
                    'end': {'x': 25, 'y': 0, 'z': 8},
                    'speed': 1.0,
                    'is_primary': True
                },
                {
                    'name': 'Wing Drone Left',
                    'start': {'x': -2, 'y': -3, 'z': 6},
                    'end': {'x': 23, 'y': -3, 'z': 6},
                    'speed': 1.0,
                    'is_primary': False
                },
                {
                    'name': 'Wing Drone Right',
                    'start': {'x': -2, 'y': 3, 'z': 6},
                    'end': {'x': 23, 'y': 3, 'z': 6},
                    'speed': 1.0,
                    'is_primary': False
                },
                {
                    'name': 'Support Drone',
                    'start': {'x': -4, 'y': 0, 'z': 4},
                    'end': {'x': 21, 'y': 0, 'z': 4},
                    'speed': 1.0,
                    'is_primary': False
                }
            ]
        }
    ]
    
    return scenarios
