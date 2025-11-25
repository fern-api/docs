import os
from plantstore import PlantClient

client = PlantClient(api_key=os.environ["PLANT_API_KEY"])

def get_plant(plant_id: str):
    return client.plants.get(plant_id)

def create_plant(name: str, species: str):
    return client.plants.create(name=name, species=species)

def water_plant(plant_id: str):
    return client.plants.water(plant_id)
