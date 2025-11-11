import pdfplumber
import re
from datetime import datetime
from typing import List, Dict
import io

class PDFParser:
    """Parse bank statements from PDF files"""
    
    def __init__(self):
        self.date_patterns = [
            r'\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY
            r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
            r'\d{2}-\d{2}-\d{4}',  # DD-MM-YYYY
            r'\d{2}/[A-Z]{3}',  # DD/MMM (e.g., 05/SEP, 11/SEP) - BBVA format
        ]
        self.amount_pattern = r'[\d,]+\.?\d*'
        self.month_map = {
            'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
        }
    
    def extract_text(self, pdf_file: bytes) -> str:
        """Extract all text from PDF"""
        text = ""
        with pdfplumber.open(io.BytesIO(pdf_file)) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text
    
    def parse_date(self, date_str: str, year: int = None) -> datetime:
        """Parse date string to datetime object"""
        date_str = date_str.strip()
        
        # Try BBVA format first (DD/MMM)
        bbva_match = re.search(r'(\d{2})/([A-Z]{3})', date_str)
        if bbva_match:
            day = int(bbva_match.group(1))
            month_str = bbva_match.group(2)
            if month_str in self.month_map:
                month = self.month_map[month_str]
                # Use current year or provided year, default to current
                if year is None:
                    year = datetime.now().year
                try:
                    return datetime(year, month, day)
                except ValueError:
                    pass
        
        # Try standard formats
        for pattern in [r'\d{2}/\d{2}/\d{4}', r'\d{4}-\d{2}-\d{2}', r'\d{2}-\d{2}-\d{4}']:
            match = re.search(pattern, date_str)
            if match:
                date_part = match.group()
                for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
                    try:
                        return datetime.strptime(date_part, fmt)
                    except ValueError:
                        continue
        return None
    
    def parse_amount(self, amount_str: str) -> float:
        """Parse amount string to float"""
        # Remove currency symbols and commas
        cleaned = re.sub(r'[^\d.-]', '', amount_str.replace(',', ''))
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    
    def is_header_footer(self, line: str) -> bool:
        """Check if line is header/footer content that should be skipped"""
        line_lower = line.lower()
        
        # Skip header patterns
        skip_patterns = [
            r'^periodo\s+del', r'^fecha de corte', r'^no\.?\s*de cuenta', r'^no\.?\s*de cliente',
            r'^r\.?f\.?c\.?', r'^clabe', r'^sucursal', r'^direccion', r'^telefono',
            r'^saldo', r'^depositos', r'^retiros', r'^total', r'^página', r'^pagina',
            r'^concepto', r'^cantidad', r'^columna', r'^av\.?\s+paseo', r'^ciudad de',
            r'^código postal', r'^régimen fiscal', r'^uso de cfdi', r'^exportación',
            r'^no\.?\s*de serie', r'^fecha y hora', r'^estimado cliente',
            r'^disposición oficial', r'^certificado', r'^vencimiento',
            r'^tiene\s+\d+', r'^aclaración', r'^llamando al', r'^electrónico',
            r'^www\.', r'^persona que', r'^número de cuenta',
            r'^depósitos\s*/\s*abonos', r'^otros\s+cargos', r'^abonos\s*\(', r'^cargos\s*\(',
            r'^total\s+importe', r'^total\s+movimientos', r'^nota\s*:', r'^la\s+gat',
            r'^bbva\s+mexico', r'^institucion\s+de\s+banca', r'^grupo\s+financiero',
            r'^\d{10,}',  # Very long numbers (account numbers, etc.)
            r'^\(cid:',  # PDF encoding artifacts
            r'^[a-z0-9+/=]{50,}',  # Base64-like strings (certificates, etc.)
            r'^[a-z0-9+/=]{30,}\|',  # Base64 with pipe (certificates)
            r'granada.*código\s+postal',  # Address patterns
            r'col\.\s+juárez', r'alcaldía', r'paseo\s+de\s+la\s+reforma',
        ]
        
        for pattern in skip_patterns:
            if re.search(pattern, line_lower):
                return True
        
        # Skip lines that are mostly numbers or very short
        if len(line.strip()) < 5:
            return True
        
        # Skip lines that look like addresses
        if re.search(r'cp\s*\d+|col\.|colonia|calle|avenida|av\.', line_lower):
            return True
        
        # Skip summary lines (contain totals, percentages, etc.)
        if re.search(r'total|porcentaje|señala|columna|rendimiento|gat', line_lower):
            if not any(merchant in line_lower for merchant in ['rest', 'uber', 'spei', 'starbucks']):
                return True
        
        return False
    
    def is_valid_transaction(self, description: str, amount: float) -> bool:
        """Validate if this looks like a real transaction"""
        # Amount must be reasonable (between 1 and 10,000,000 MXN)
        if amount < 1 or amount > 10000000:
            return False
        
        # Description must have some text (not just numbers)
        if len(description) < 5:
            return False
        
        # Skip if description is mostly numbers
        num_chars = sum(c.isdigit() for c in description)
        if num_chars > len(description) * 0.7:
            return False
        
        # Skip common non-transaction patterns
        desc_lower = description.lower()
        invalid_patterns = [
            r'^\d+$',  # Just numbers
            r'^no\.?\s*de',  # "No. de Cuenta", etc.
            r'^r\.?f\.?c\.?',  # RFC
            r'^clabe',  # CLABE
            r'^página',  # Page numbers
            r'^pagina',
            r'^av\.?\s+paseo',  # Addresses
            r'^ciudad de',
            r'^código postal',
            r'^\(cid:',  # PDF artifacts
            r'^[a-z0-9+/=]{30,}$',  # Base64-like
            r'^[a-z0-9+/=]{20,}\|',  # Base64 with pipe
            r'depósitos\s*/\s*abonos',  # Summary lines
            r'otros\s+cargos',  # Summary lines
            r'total\s+importe',  # Summary lines
            r'total\s+movimientos',  # Summary lines
            r'nota\s*:',  # Notes
            r'la\s+gat\s+real',  # Footer text
            r'bbva\s+mexico',  # Footer text
            r'institucion\s+de\s+banca',  # Footer text
            r'grupo\s+financiero',  # Footer text
            r'señala\s+con',  # Note text
            r'columna.*porcentaje',  # Note text
            r'granada.*código\s+postal',  # Address
            r'col\.\s+juárez',  # Address
            r'alcaldía',  # Address
            r'estimado\s+cliente',  # Footer text
            r'disposición\s+oficial',  # Footer text
        ]
        
        for pattern in invalid_patterns:
            if re.search(pattern, desc_lower):
                return False
        
        return True
    
    def is_reference_line(self, line: str) -> bool:
        """Check if line is a reference/code line that should be skipped"""
        line = line.strip()
        line_lower = line.lower()
        
        # Skip reference lines
        if line_lower.startswith('referencia'):
            return True
        
        # Skip long alphanumeric codes (like MBAN01002510030092914825, 00638180010133810588)
        if re.match(r'^[A-Z0-9]{15,}$', line):
            return True
        
        # Skip lines that are just numbers with letters (like 0109250dhl)
        if re.match(r'^\d+[a-z]+$', line_lower) and len(line) < 20:
            return True
        
        # Skip lines that look like names (all caps, multiple words)
        if re.match(r'^[A-ZÁÉÍÓÚÑ\s]{10,}$', line) and not any(char.isdigit() for char in line):
            return True
        
        return False
    
    def extract_transactions(self, pdf_file: bytes) -> List[Dict]:
        """Extract transactions from PDF - improved for BBVA format with better filtering"""
        text = self.extract_text(pdf_file)
        lines = text.split('\n')
        
        transactions = []
        current_date = None
        current_year = None
        in_transactions_section = False
        end_transactions_section = False
        
        # Try to extract year from statement period
        period_match = re.search(r'DEL\s+(\d{2})/(\d{2})/(\d{4})', text, re.IGNORECASE)
        if period_match:
            current_year = int(period_match.group(3))
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
            
            # Look for start of transactions section
            if 'detalle de movimientos realizados' in line.lower():
                in_transactions_section = True
                i += 1
                continue
            
            # Look for end of transactions section
            if in_transactions_section and ('total de movimientos' in line.lower() or 
                                           'total movimientos' in line.lower() or
                                           'tOTAL IMPORTE' in line or
                                           'TOTAL IMPORTE CARGOS' in line):
                end_transactions_section = True
                break
            
            # Only process if we're in the transactions section
            if not in_transactions_section:
                i += 1
                continue
            
            # Skip header/footer content
            if self.is_header_footer(line):
                i += 1
                continue
            
            # Skip reference lines and code lines
            if self.is_reference_line(line):
                i += 1
                continue
            
            # Skip lines that are just RFC, AUT codes, etc.
            if re.match(r'^(RFC|AUT|Referencia):', line, re.IGNORECASE):
                i += 1
                continue
            
            # Try to find date pattern: DD/MMM DD/MMM or DD/MMM at the start
            date_match = None
            # BBVA format: "03/OCT 03/OCT" or "02/OCT 01/OCT" at start of line
            bbva_date_match = re.match(r'^(\d{2}/[A-Z]{3})(?:\s+(\d{2}/[A-Z]{3}))?', line)
            if bbva_date_match:
                date_str = bbva_date_match.group(1)  # Use first date (OPER date)
                date_match = self.parse_date(date_str, current_year)
                if date_match:
                    current_date = date_match
            
            # If we found a date, this might be a transaction line
            if current_date:
                # Remove date from line to get description and amounts
                desc_line = re.sub(r'^\d{2}/[A-Z]{3}\s+\d{2}/[A-Z]{3}\s*', '', line)
                desc_line = re.sub(r'^\d{2}/[A-Z]{3}\s*', '', desc_line)
                desc_line = desc_line.strip()
                
                # Look for amounts in the line (CARGOS or ABONOS)
                # Pattern: description followed by amounts (could be multiple: amount, balance, balance)
                # Example: "SPEI ENVIADO NU MEXICO 500.00 832.22 832.22"
                # Example: "CARNICERIA LA TAPATIA 84.00"
                
                # Extract all amounts (with decimals)
                amounts = re.findall(r'\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}', desc_line)
                
                if amounts:
                    # The first amount is usually the transaction amount (CARGOS or ABONOS)
                    # Subsequent amounts are usually balances (OPERACION, SALDO LIQUIDACION)
                    transaction_amount_str = amounts[0]
                    transaction_amount = self.parse_amount(transaction_amount_str)
                    
                    # Extract description (everything before the first amount)
                    amount_pos = desc_line.find(transaction_amount_str)
                    if amount_pos > 0:
                        description = desc_line[:amount_pos].strip()
                    else:
                        description = desc_line.strip()
                    
                    # Clean description
                    description = re.sub(r'\s+', ' ', description)
                    description = description.strip()
                    
                    # Validate transaction
                    if self.is_valid_transaction(description, transaction_amount):
                        # Determine transaction type
                        desc_lower = description.lower()
                        
                        # SPEI ENVIADO = expense, SPEI RECIBIDO = income
                        if 'spei recibido' in desc_lower or 'recibido' in desc_lower:
                            transaction_type = "income"
                        elif 'spei enviado' in desc_lower or 'enviado' in desc_lower:
                            transaction_type = "expense"
                        else:
                            # Default: most transactions are expenses unless they're clearly income
                            # If it has CARGOS column filled, it's expense
                            # If it has ABONOS column filled, it's income
                            # For now, default to expense
                            transaction_type = "expense"
                        
                        transactions.append({
                            "date": current_date,
                            "description": description,
                            "amount": transaction_amount,
                            "transaction_type": transaction_type,
                            "original_text": line[:150]
                        })
            
            i += 1
        
        return transactions
    
    def parse_statement(self, pdf_file: bytes) -> List[Dict]:
        """Main method to parse bank statement"""
        return self.extract_transactions(pdf_file)

