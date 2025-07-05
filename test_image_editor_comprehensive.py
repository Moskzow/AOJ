import requests
import json
import os
from dotenv import load_dotenv

# Load backend URL from frontend/.env
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
API_URL = f"{BACKEND_URL}/api"

# Default credentials
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"

def login():
    print("Logging in...")
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"username": DEFAULT_USERNAME, "password": DEFAULT_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data:
                token = data["token"]
                print("Successfully authenticated and received JWT token")
                return token
            else:
                print("No token in response")
        else:
            print(f"Failed with status code: {response.status_code}")
    except Exception as e:
        print(f"Exception: {str(e)}")
    
    return None

def test_image_editor_save():
    token = login()
    if not token:
        print("Failed to login, cannot proceed with test")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a test collection
    print("Creating a test collection...")
    try:
        new_collection = {
            "name": "Test Collection for Image Editor",
            "description": "A collection created for testing image editor",
            "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAVSf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABCf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=",
            "position": 99
        }
        
        response = requests.post(
            f"{API_URL}/collections",
            headers=headers,
            json=new_collection
        )
        
        if response.status_code == 200:
            created_collection = response.json()
            if "id" in created_collection:
                collection_id = created_collection["id"]
                print(f"Successfully created collection with ID: {collection_id}")
                
                # Verify the collection was created
                print("Verifying collection creation...")
                verify_response = requests.get(f"{API_URL}/collections")
                if verify_response.status_code == 200:
                    collections = verify_response.json()
                    collection_exists = False
                    for collection in collections:
                        if collection["id"] == collection_id:
                            collection_exists = True
                            print(f"Found collection in response: {json.dumps(collection)}")
                            break
                    
                    if collection_exists:
                        print("Collection creation verified")
                        
                        # Create a test jewelry item
                        print("Creating a test jewelry item...")
                        new_item = {
                            "name": "Test Item for Image Editor",
                            "description": "A jewelry item created for testing image editor",
                            "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAVSf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABCf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=",
                            "collection_id": collection_id,
                            "position": 99
                        }
                        
                        item_response = requests.post(
                            f"{API_URL}/jewelry-items",
                            headers=headers,
                            json=new_item
                        )
                        
                        if item_response.status_code == 200:
                            created_item = item_response.json()
                            if "id" in created_item:
                                item_id = created_item["id"]
                                print(f"Successfully created jewelry item with ID: {item_id}")
                                
                                # Test POST /api/save-edited-image for a jewelry item
                                print("Testing image editor save for jewelry item...")
                                edited_image_data = {
                                    "item_id": item_id,
                                    "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAVSf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABCf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k="
                                }
                                
                                print(f"Request data: {json.dumps(edited_image_data)}")
                                
                                save_response = requests.post(
                                    f"{API_URL}/save-edited-image",
                                    headers=headers,
                                    json=edited_image_data
                                )
                                
                                print(f"Response status code: {save_response.status_code}")
                                print(f"Response content: {save_response.text}")
                                
                                if save_response.status_code == 200:
                                    print("Successfully saved edited image for jewelry item")
                                    
                                    # Test POST /api/save-edited-image for a collection
                                    print("Testing image editor save for collection...")
                                    edited_collection_image_data = {
                                        "collection_id": collection_id,
                                        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAVSf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABCf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k="
                                    }
                                    
                                    print(f"Request data: {json.dumps(edited_collection_image_data)}")
                                    
                                    collection_response = requests.post(
                                        f"{API_URL}/save-edited-image",
                                        headers=headers,
                                        json=edited_collection_image_data
                                    )
                                    
                                    print(f"Response status code: {collection_response.status_code}")
                                    print(f"Response content: {collection_response.text}")
                                    
                                    if collection_response.status_code == 200:
                                        print("Successfully saved edited image for collection")
                                    else:
                                        print(f"Failed to save edited image for collection: {collection_response.status_code}")
                                else:
                                    print(f"Failed to save edited image for jewelry item: {save_response.status_code}")
                                
                                # Clean up - delete the test item
                                print("Cleaning up test jewelry item...")
                                delete_item_response = requests.delete(
                                    f"{API_URL}/jewelry-items/{item_id}",
                                    headers=headers
                                )
                                
                                if delete_item_response.status_code == 200:
                                    print("Successfully deleted test jewelry item")
                                else:
                                    print(f"Failed to delete test jewelry item: {delete_item_response.status_code}")
                            else:
                                print("No ID in created jewelry item response")
                        else:
                            print(f"Failed to create test jewelry item: {item_response.status_code}")
                    else:
                        print("Collection not found after creation")
                else:
                    print(f"Failed to get collections: {verify_response.status_code}")
                
                # Clean up - delete the test collection
                print("Cleaning up test collection...")
                delete_collection_response = requests.delete(
                    f"{API_URL}/collections/{collection_id}",
                    headers=headers
                )
                
                if delete_collection_response.status_code == 200:
                    print("Successfully deleted test collection")
                else:
                    print(f"Failed to delete test collection: {delete_collection_response.status_code}")
            else:
                print("No ID in created collection response")
        else:
            print(f"Failed to create test collection: {response.status_code}")
    except Exception as e:
        print(f"Exception: {str(e)}")

if __name__ == "__main__":
    test_image_editor_save()