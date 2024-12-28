# modules/depth_estimation.py

from transformers import pipeline

def get_depth_map(frame):
    """
    Estimates depth map from a given frame.
    
    Parameters:
        frame (numpy.ndarray): Input frame
        pipe (transformers.Pipeline): Depth estimation pipeline
    
    Returns:
        numpy.ndarray: Depth map
    """
    pipe = initialize_depth_pipeline()
    result = pipe(frame)
    depth_map = result["depth"] # type: ignore
    return depth_map


def initialize_depth_pipeline(device="cpu"):
    """
    Initializes the depth estimation pipeline.
    
    Parameters:
        device (str): Device to run the model on ('cpu' or 'cuda')
    
    Returns:
        transformers.Pipeline: The initialized depth estimation pipeline
    """
    pipe = pipeline(
        task="depth-estimation",
        model="depth-anything/Depth-Anything-V2-Small-hf",
        device=device
    )
    return pipe