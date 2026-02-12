import requests
from readability import Document
import trafilatura
from bs4 import BeautifulSoup

class JobExtractionError(Exception):
    pass

session = requests.Session()

session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
})

def fetch_html(url: str) -> str:
    try:
        response = session.get(
            url,
            timeout=10,
            allow_redirects=True,
        )
        response.raise_for_status()
        return response.text
    
    except requests.RequestException:
        raise JobExtractionError(f"Extraction blocked by Website.")
    
def html_to_text(html):
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text(separator="\n")

def extract_with_readability(html: str) -> str:
    try:
        doc = Document(html)
        return doc.summary()
    except Exception:
        return ""
    
def extract_with_trafilatura(html: str) -> str:
    try:
        return trafilatura.extract(html) or ""
    except Exception:
        return ""

def clean_text(text: str) -> str:
    return " ".join(text.split())

def extract_job_description(url: str) -> str:
    html = fetch_html(url)
    
    content = extract_with_readability(html)
    if not content or len(content) < 200:
        content = extract_with_trafilatura(html)

    content = html_to_text(content)
    content = clean_text(content)

    if not content or len(content) < 200:
        raise JobExtractionError("Could not extract sufficient content from the job posting.")
    
    return content