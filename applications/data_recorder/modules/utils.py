# modules/utils.py

import numpy as np


def simulate_joint_outputs():
    """
    Creates random 360x3 joint data (e.g., 360 joints in 3D) for demonstration.
    """
    return np.random.rand(360, 3)