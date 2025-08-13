from app import db
from datetime import datetime
import json

class Drone(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    start_x = db.Column(db.Float, nullable=False)
    start_y = db.Column(db.Float, nullable=False)
    start_z = db.Column(db.Float, nullable=False)
    end_x = db.Column(db.Float, nullable=False)
    end_y = db.Column(db.Float, nullable=False)
    end_z = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Float, default=1.0)
    is_primary = db.Column(db.Boolean, default=False)
    scenario_id = db.Column(db.Integer, nullable=True)
    has_conflict = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'start': {'x': self.start_x, 'y': self.start_y, 'z': self.start_z},
            'end': {'x': self.end_x, 'y': self.end_y, 'z': self.end_z},
            'speed': self.speed,
            'is_primary': self.is_primary,
            'scenario_id': self.scenario_id,
            'has_conflict': self.has_conflict,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Scenario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    has_conflicts = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'has_conflicts': self.has_conflicts
        }
