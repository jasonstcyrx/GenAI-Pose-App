import json
import numpy as np
# Load JSON schema
with open("json_schema/joints.json", "r") as file:
    joints_schema = json.load(file)

# Example import JSON data from file
json_data = joints_schema

# Function to convert JSON to NumPy array
def json_to_array(json_object):
    """
    Converts a JSON object with joint values into a NumPy array.
    
    Args:
        json_object (dict): JSON object containing joint data.

    Returns:
        np.ndarray: NumPy array with the joint values. 
    """
    return np.array(list(json_object.values()), dtype=np.float32)

# Function to convert NumPy array back to JSON
def array_to_json(array, original_keys):
    """
    Converts a NumPy array back into a JSON object using original keys.
    
    Args:
        array (np.ndarray): NumPy array containing joint values.
        original_keys (list): List of keys corresponding to the original JSON.

    Returns:
        dict: JSON object with joint data.
    """
    return dict(zip(original_keys, array.tolist()))

# Example usage
def main():
    # Convert JSON to array
    joint_array = json_to_array(json_data)
    print("Joint Data as Array:")
    print(joint_array)

    # Simulate modifying the array
    joint_array[0] = 1.0  # Example: Change the first joint value

    # Convert array back to JSON
    updated_json = array_to_json(joint_array, list(json_data.keys()))
    print("\nUpdated JSON Object:")
    print(json.dumps(updated_json, indent=4))

if __name__ == "__main__":
    main()