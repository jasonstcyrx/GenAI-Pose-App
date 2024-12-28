# Licensed under the Apache License, Version 2.0 (the "License");
# We are going to be building a ML model that can take in the following: 

#  - image of the current environment taken in first person mode (eyes) (timespamped mode)
#  - instruction of the current task that will be executed 
#  - intent of the current task ("move forward") etc. 
#  - current motion joint/rotation data in the same frame tiem of the image 

# The model will be trained using a dataset of images of the environment, 
# instruction, intent, and motion joint/rotation data.

#  The output of the model: 
#  - intent of the current task ("string")
#  - Next time step motion joint/rotation data ([...vectorized sequence of motion joint/rotation data])
#  - tasks completed 0/1


# Import necessary libraries
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.models as models
import torchvision.transforms as transforms

