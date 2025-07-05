import requests
import json
import os
import sys
from dotenv import load_dotenv
import time

# Load backend URL from frontend/.env
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
API_URL = f"{BACKEND_URL}/api"

# Default credentials
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"

# Test results
test_results = {
    "auth": {"success": False, "message": ""},
    "config": {"success": False, "message": ""},
    "demo_data": {"success": False, "message": ""},
    "collections": {"success": False, "message": ""},
    "jewelry_items": {"success": False, "message": ""}
}

# Helper functions
def print_header(title):
    print("\n" + "=" * 80)
    print(f" {title} ".center(80, "="))
    print("=" * 80)

def print_result(test_name, success, message=""):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"{test_name}: {status}")
    if message:
        print(f"  {message}")
    return success

def login():
    print_header("Testing Authentication")
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"username": DEFAULT_USERNAME, "password": DEFAULT_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data:
                token = data["token"]
                print_result("Authentication", True, "Successfully authenticated and received JWT token")
                test_results["auth"]["success"] = True
                test_results["auth"]["message"] = "Authentication successful"
                return token
            else:
                print_result("Authentication", False, "No token in response")
                test_results["auth"]["message"] = "No token in response"
        else:
            print_result("Authentication", False, f"Failed with status code: {response.status_code}")
            test_results["auth"]["message"] = f"Failed with status code: {response.status_code}"
    except Exception as e:
        print_result("Authentication", False, f"Exception: {str(e)}")
        test_results["auth"]["message"] = f"Exception: {str(e)}"
    
    return None

def test_site_config(token=None):
    print_header("Testing Site Configuration")
    
    # Test GET /api/config (unauthenticated)
    try:
        response = requests.get(f"{API_URL}/config")
        
        if response.status_code == 200:
            config_data = response.json()
            if "site_name" in config_data and "artisan_name" in config_data:
                print_result("GET /api/config (unauthenticated)", True, "Successfully retrieved site configuration")
                test_results["config"]["success"] = True
                test_results["config"]["message"] = "Site configuration retrieved successfully"
            else:
                print_result("GET /api/config (unauthenticated)", False, "Missing expected fields in response")
                test_results["config"]["message"] = "Missing expected fields in response"
        else:
            print_result("GET /api/config (unauthenticated)", False, f"Failed with status code: {response.status_code}")
            test_results["config"]["message"] = f"Failed with status code: {response.status_code}"
    except Exception as e:
        print_result("GET /api/config (unauthenticated)", False, f"Exception: {str(e)}")
        test_results["config"]["message"] = f"Exception: {str(e)}"
    
    # Test PUT /api/config (authenticated)
    if token:
        try:
            headers = {"Authorization": f"Bearer {token}"}
            update_data = {
                "site_name": "Updated Jewelry Catalog",
                "artisan_name": "Master Artisan"
            }
            
            response = requests.put(
                f"{API_URL}/config",
                headers=headers,
                json=update_data
            )
            
            if response.status_code == 200:
                print_result("PUT /api/config (authenticated)", True, "Successfully updated site configuration")
                
                # Verify the update
                verify_response = requests.get(f"{API_URL}/config")
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    if verify_data["site_name"] == update_data["site_name"]:
                        print_result("Verify config update", True, "Configuration update verified")
                    else:
                        print_result("Verify config update", False, "Configuration update not reflected in GET response")
            else:
                print_result("PUT /api/config (authenticated)", False, f"Failed with status code: {response.status_code}")
        except Exception as e:
            print_result("PUT /api/config (authenticated)", False, f"Exception: {str(e)}")

def test_demo_data():
    print_header("Testing Demo Data Initialization")
    
    try:
        response = requests.post(f"{API_URL}/init-demo-data")
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and data["message"] == "Demo data already exists":
                print_result("POST /api/init-demo-data", True, "Demo data already exists (expected)")
                test_results["demo_data"]["success"] = True
                test_results["demo_data"]["message"] = "Demo data already exists"
            else:
                print_result("POST /api/init-demo-data", True, "Successfully initialized demo data")
                test_results["demo_data"]["success"] = True
                test_results["demo_data"]["message"] = "Demo data initialized successfully"
            
            # Verify collections were created
            collections_response = requests.get(f"{API_URL}/collections")
            if collections_response.status_code == 200:
                collections = collections_response.json()
                if len(collections) >= 3:
                    print_result("Verify collections created", True, f"Found {len(collections)} collections")
                else:
                    print_result("Verify collections created", False, f"Expected at least 3 collections, found {len(collections)}")
            else:
                print_result("Verify collections created", False, f"Failed to get collections: {collections_response.status_code}")
        else:
            print_result("POST /api/init-demo-data", False, f"Failed with status code: {response.status_code}")
            test_results["demo_data"]["message"] = f"Failed with status code: {response.status_code}"
    except Exception as e:
        print_result("POST /api/init-demo-data", False, f"Exception: {str(e)}")
        test_results["demo_data"]["message"] = f"Exception: {str(e)}"

def test_collections(token=None):
    print_header("Testing Collections CRUD")
    
    # Test GET /api/collections (unauthenticated)
    collection_id = None
    try:
        response = requests.get(f"{API_URL}/collections")
        
        if response.status_code == 200:
            collections = response.json()
            if len(collections) > 0:
                collection_id = collections[0]["id"]
                print_result("GET /api/collections (unauthenticated)", True, f"Successfully retrieved {len(collections)} collections")
            else:
                print_result("GET /api/collections (unauthenticated)", True, "Successfully retrieved empty collections list")
        else:
            print_result("GET /api/collections (unauthenticated)", False, f"Failed with status code: {response.status_code}")
    except Exception as e:
        print_result("GET /api/collections (unauthenticated)", False, f"Exception: {str(e)}")
    
    if not token:
        print_result("Collections CRUD (authenticated)", False, "Skipping authenticated tests - no token available")
        return collection_id
    
    # Test POST /api/collections (authenticated)
    try:
        headers = {"Authorization": f"Bearer {token}"}
        new_collection = {
            "name": "Test Collection",
            "description": "A collection created during testing",
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
                print_result("POST /api/collections (authenticated)", True, f"Successfully created collection with ID: {collection_id}")
                
                # Test PUT /api/collections/{id} (authenticated)
                update_data = {
                    "name": "Updated Test Collection",
                    "description": "Updated description",
                    "image_base64": new_collection["image_base64"],
                    "position": 100
                }
                
                update_response = requests.put(
                    f"{API_URL}/collections/{collection_id}",
                    headers=headers,
                    json=update_data
                )
                
                if update_response.status_code == 200:
                    print_result("PUT /api/collections/{id} (authenticated)", True, "Successfully updated collection")
                    
                    # Verify the update
                    verify_response = requests.get(f"{API_URL}/collections")
                    if verify_response.status_code == 200:
                        collections = verify_response.json()
                        updated = False
                        for collection in collections:
                            if collection["id"] == collection_id and collection["name"] == update_data["name"]:
                                updated = True
                                break
                        
                        if updated:
                            print_result("Verify collection update", True, "Collection update verified")
                        else:
                            print_result("Verify collection update", False, "Collection update not reflected in GET response")
                else:
                    print_result("PUT /api/collections/{id} (authenticated)", False, f"Failed with status code: {update_response.status_code}")
                
                # Test DELETE /api/collections/{id} (authenticated)
                delete_response = requests.delete(
                    f"{API_URL}/collections/{collection_id}",
                    headers=headers
                )
                
                if delete_response.status_code == 200:
                    print_result("DELETE /api/collections/{id} (authenticated)", True, "Successfully deleted collection")
                    
                    # Verify the deletion
                    verify_response = requests.get(f"{API_URL}/collections")
                    if verify_response.status_code == 200:
                        collections = verify_response.json()
                        deleted = True
                        for collection in collections:
                            if collection["id"] == collection_id:
                                deleted = False
                                break
                        
                        if deleted:
                            print_result("Verify collection deletion", True, "Collection deletion verified")
                            test_results["collections"]["success"] = True
                            test_results["collections"]["message"] = "All collection CRUD operations successful"
                        else:
                            print_result("Verify collection deletion", False, "Collection still exists after deletion")
                else:
                    print_result("DELETE /api/collections/{id} (authenticated)", False, f"Failed with status code: {delete_response.status_code}")
            else:
                print_result("POST /api/collections (authenticated)", False, "No ID in created collection response")
        else:
            print_result("POST /api/collections (authenticated)", False, f"Failed with status code: {response.status_code}")
    except Exception as e:
        print_result("Collections CRUD (authenticated)", False, f"Exception: {str(e)}")
    
    return collection_id

def test_jewelry_items(token=None, collection_id=None):
    print_header("Testing Jewelry Items CRUD")
    
    if not collection_id:
        # Try to get a collection ID
        try:
            response = requests.get(f"{API_URL}/collections")
            if response.status_code == 200:
                collections = response.json()
                if len(collections) > 0:
                    collection_id = collections[0]["id"]
                else:
                    print_result("Jewelry Items CRUD", False, "No collections available for testing jewelry items")
                    return
            else:
                print_result("Jewelry Items CRUD", False, "Failed to get collections for testing jewelry items")
                return
        except Exception as e:
            print_result("Jewelry Items CRUD", False, f"Exception getting collections: {str(e)}")
            return
    
    # Test GET /api/collections/{collection_id}/items (unauthenticated)
    try:
        response = requests.get(f"{API_URL}/collections/{collection_id}/items")
        
        if response.status_code == 200:
            items = response.json()
            print_result("GET /api/collections/{id}/items (unauthenticated)", True, f"Successfully retrieved {len(items)} jewelry items")
        else:
            print_result("GET /api/collections/{id}/items (unauthenticated)", False, f"Failed with status code: {response.status_code}")
    except Exception as e:
        print_result("GET /api/collections/{id}/items (unauthenticated)", False, f"Exception: {str(e)}")
    
    # Test GET /api/jewelry-items (unauthenticated)
    try:
        response = requests.get(f"{API_URL}/jewelry-items")
        
        if response.status_code == 200:
            items = response.json()
            print_result("GET /api/jewelry-items (unauthenticated)", True, f"Successfully retrieved {len(items)} jewelry items")
        else:
            print_result("GET /api/jewelry-items (unauthenticated)", False, f"Failed with status code: {response.status_code}")
    except Exception as e:
        print_result("GET /api/jewelry-items (unauthenticated)", False, f"Exception: {str(e)}")
    
    if not token:
        print_result("Jewelry Items CRUD (authenticated)", False, "Skipping authenticated tests - no token available")
        return
    
    # Test POST /api/jewelry-items (authenticated)
    try:
        headers = {"Authorization": f"Bearer {token}"}
        new_item = {
            "name": "Test Jewelry Item",
            "description": "A jewelry item created during testing",
            "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAVSf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABCf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=",
            "collection_id": collection_id,
            "position": 99
        }
        
        response = requests.post(
            f"{API_URL}/jewelry-items",
            headers=headers,
            json=new_item
        )
        
        if response.status_code == 200:
            created_item = response.json()
            if "id" in created_item:
                item_id = created_item["id"]
                print_result("POST /api/jewelry-items (authenticated)", True, f"Successfully created jewelry item with ID: {item_id}")
                
                # Test PUT /api/jewelry-items/{id} (authenticated)
                update_data = {
                    "name": "Updated Test Jewelry Item",
                    "description": "Updated description",
                    "image_base64": new_item["image_base64"],
                    "collection_id": collection_id,
                    "position": 100
                }
                
                update_response = requests.put(
                    f"{API_URL}/jewelry-items/{item_id}",
                    headers=headers,
                    json=update_data
                )
                
                if update_response.status_code == 200:
                    print_result("PUT /api/jewelry-items/{id} (authenticated)", True, "Successfully updated jewelry item")
                    
                    # Verify the update
                    verify_response = requests.get(f"{API_URL}/jewelry-items")
                    if verify_response.status_code == 200:
                        items = verify_response.json()
                        updated = False
                        for item in items:
                            if item["id"] == item_id and item["name"] == update_data["name"]:
                                updated = True
                                break
                        
                        if updated:
                            print_result("Verify jewelry item update", True, "Jewelry item update verified")
                        else:
                            print_result("Verify jewelry item update", False, "Jewelry item update not reflected in GET response")
                else:
                    print_result("PUT /api/jewelry-items/{id} (authenticated)", False, f"Failed with status code: {update_response.status_code}")
                
                # Test DELETE /api/jewelry-items/{id} (authenticated)
                delete_response = requests.delete(
                    f"{API_URL}/jewelry-items/{item_id}",
                    headers=headers
                )
                
                if delete_response.status_code == 200:
                    print_result("DELETE /api/jewelry-items/{id} (authenticated)", True, "Successfully deleted jewelry item")
                    
                    # Verify the deletion
                    verify_response = requests.get(f"{API_URL}/jewelry-items")
                    if verify_response.status_code == 200:
                        items = verify_response.json()
                        deleted = True
                        for item in items:
                            if item["id"] == item_id:
                                deleted = False
                                break
                        
                        if deleted:
                            print_result("Verify jewelry item deletion", True, "Jewelry item deletion verified")
                            test_results["jewelry_items"]["success"] = True
                            test_results["jewelry_items"]["message"] = "All jewelry item CRUD operations successful"
                        else:
                            print_result("Verify jewelry item deletion", False, "Jewelry item still exists after deletion")
                else:
                    print_result("DELETE /api/jewelry-items/{id} (authenticated)", False, f"Failed with status code: {delete_response.status_code}")
            else:
                print_result("POST /api/jewelry-items (authenticated)", False, "No ID in created jewelry item response")
        else:
            print_result("POST /api/jewelry-items (authenticated)", False, f"Failed with status code: {response.status_code}")
    except Exception as e:
        print_result("Jewelry Items CRUD (authenticated)", False, f"Exception: {str(e)}")

def print_summary():
    print_header("TEST SUMMARY")
    
    all_passed = True
    for test_name, result in test_results.items():
        success = result["success"]
        message = result["message"]
        all_passed = all_passed and success
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if message:
            print(f"  {message}")
    
    print("\nOverall Result:", "✅ PASSED" if all_passed else "❌ FAILED")
    return all_passed

def main():
    print_header("JEWELRY CATALOG API TESTING")
    print(f"Backend URL: {API_URL}")
    
    # Test authentication
    token = login()
    
    # Test site configuration
    test_site_config(token)
    
    # Test demo data initialization
    test_demo_data()
    
    # Test collections CRUD
    collection_id = test_collections(token)
    
    # Test jewelry items CRUD
    test_jewelry_items(token, collection_id)
    
    # Print summary
    success = print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())