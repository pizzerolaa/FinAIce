import os
from openai import OpenAI
from typing import Dict, List, Optional
from dotenv import load_dotenv
import time

load_dotenv()

class AICategorizer:
    """Use keyword-based categorization with optional OpenAI enhancement"""
    
    CATEGORIES = [
        "Food",
        "Transportation",
        "Payments/Recurring expenses",
        "Personal shopping",
        "Entertainment"
    ]
    
    def __init__(self, use_openai: bool = True):
        self.use_openai = use_openai
        self.openai_available = False
        self.client = None
        
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and use_openai:
            try:
                self.client = OpenAI(api_key=api_key)
                self.openai_available = True
            except Exception as e:
                print(f"Warning: OpenAI initialization failed: {e}")
                self.openai_available = False
    
    def categorize_transaction(self, description: str, amount: float, use_ai: bool = False) -> str:
        """Categorize a single transaction - uses keyword-based first, AI as optional enhancement"""
        # Always try keyword-based first (fast and free)
        keyword_category = self.get_smart_category(description)
        
        # Only use AI if explicitly requested and available
        if use_ai and self.openai_available and self.client:
            try:
                prompt = f"""Categorize this bank transaction into one of these categories:
- Food
- Transportation
- Payments/Recurring expenses
- Personal shopping
- Entertainment

Transaction description: "{description}"
Amount: {amount}

Respond with ONLY the category name, nothing else."""

                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a financial categorization assistant. Always respond with only the category name."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=20,
                    temperature=0.3
                )
                ai_category = response.choices[0].message.content.strip()
                
                # Validate AI category
                if ai_category in self.CATEGORIES:
                    return ai_category
                # Try to match partial
                for cat in self.CATEGORIES:
                    if cat.lower() in ai_category.lower() or ai_category.lower() in cat.lower():
                        return cat
            except Exception as e:
                # If OpenAI fails (quota, etc.), fall back to keyword-based
                error_str = str(e)
                if "quota" in error_str.lower() or "429" in error_str:
                    print(f"OpenAI quota exceeded, using keyword-based categorization")
                    self.openai_available = False  # Disable AI for rest of batch
                else:
                    print(f"Error categorizing with AI: {e}")
        
        # Return keyword-based category (default)
        return keyword_category
    
    def categorize_batch(self, transactions: List[Dict], use_ai: bool = False) -> List[Dict]:
        """Categorize multiple transactions efficiently - uses keyword-based by default"""
        categorized = []
        ai_count = 0
        max_ai_requests = 10  # Limit AI requests to avoid quota issues
        
        for transaction in transactions:
            # Use AI only for first N transactions if requested, otherwise use keywords
            should_use_ai = use_ai and ai_count < max_ai_requests and self.openai_available
            
            category = self.categorize_transaction(
                transaction.get("description", ""),
                transaction.get("amount", 0),
                use_ai=should_use_ai
            )
            
            if should_use_ai:
                ai_count += 1
                # Small delay to avoid rate limits
                time.sleep(0.1)
            
            transaction["category"] = category
            categorized.append(transaction)
        
        return categorized
    
    def get_smart_category(self, description: str) -> str:
        """Quick categorization based on keywords - primary method"""
        description_lower = description.lower()
        
        # Food keywords (expanded for Mexican context)
        food_keywords = [
            "restaurant", "rest", "food", "uber eats", "rappi", "starbucks", "cafe", "cafeteria",
            "super", "supermarket", "tienda", "comida", "taqueria", "taqueria", "burger", "pizza",
            "dominos", "little caesars", "bross", "capitako", "farmacia", "farmacia guadalajara",
            "oxxo", "7-eleven", "soriana", "walmart", "chedraui", "comercial mexicana"
        ]
        if any(keyword in description_lower for keyword in food_keywords):
            return "Food"
        
        # Transportation keywords
        transport_keywords = [
            "uber", "taxi", "gasolina", "gas", "metro", "transporte", "parking", "estacionamiento",
            "did", "cabify", "viaje", "viajes"
        ]
        if any(keyword in description_lower for keyword in transport_keywords):
            return "Transportation"
        
        # Recurring expenses / Payments
        recurring_keywords = [
            "netflix", "spotify", "amazon prime", "renta", "rent", "luz", "electric", "agua", "water",
            "internet", "phone", "telefono", "telcel", "movistar", "at&t", "spei enviado",
            "conekta", "subscription", "suscripcion", "pago", "payment"
        ]
        if any(keyword in description_lower for keyword in recurring_keywords):
            return "Payments/Recurring expenses"
        
        # Entertainment
        entertainment_keywords = [
            "cine", "movie", "theater", "teatro", "concert", "concierto", "game", "juego",
            "tickets", "app tickets", "evento", "event"
        ]
        if any(keyword in description_lower for keyword in entertainment_keywords):
            return "Entertainment"
        
        # Income detection
        if "spei recibido" in description_lower or "abono" in description_lower:
            # This will be handled by transaction_type, but good to know
            pass
        
        return "Personal shopping"

