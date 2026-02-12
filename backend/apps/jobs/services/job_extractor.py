import json
from urllib.parse import urlparse

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
        raise JobExtractionError("Extraction blocked by website.")


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text(separator="\n", strip=True)


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


def _is_job_posting_type(value) -> bool:
    if isinstance(value, str):
        return value.lower() == "jobposting"
    if isinstance(value, list):
        return any(_is_job_posting_type(item) for item in value)
    return False


def _walk_json(value):
    if isinstance(value, dict):
        yield value
        graph = value.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                yield from _walk_json(item)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_json(item)


def _extract_jobposting_json_ld(soup: BeautifulSoup):
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        payload = script.string or script.get_text(strip=True)
        if not payload:
            continue
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            continue

        for node in _walk_json(data):
            if _is_job_posting_type(node.get("@type")):
                yield node


def _normalize_company_from_domain(url: str) -> str:
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if not host:
        return ""
    return host.split(".")[0].replace("-", " ").title()


def extract_job_metadata(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    job_title = ""
    company_name = ""

    for item in _extract_jobposting_json_ld(soup):
        if not job_title:
            job_title = clean_text(str(item.get("title", "")))

        if not company_name:
            org = item.get("hiringOrganization") or item.get("hiringorganisation")
            if isinstance(org, dict):
                company_name = clean_text(str(org.get("name", "")))
            elif isinstance(org, str):
                company_name = clean_text(org)

        if job_title and company_name:
            break

    if not job_title:
        og_title = soup.find("meta", attrs={"property": "og:title"})
        if og_title and og_title.get("content"):
            job_title = clean_text(og_title["content"])

    if not job_title and soup.title and soup.title.string:
        job_title = clean_text(soup.title.string)

    if not company_name:
        og_site = soup.find("meta", attrs={"property": "og:site_name"})
        if og_site and og_site.get("content"):
            company_name = clean_text(og_site["content"])

    if not company_name:
        company_name = _normalize_company_from_domain(url)

    return {
        "job_title": job_title,
        "company_name": company_name,
    }


def extract_job_description_from_html(html: str) -> str:
    content = extract_with_readability(html)
    if not content or len(content) < 200:
        content = extract_with_trafilatura(html)

    content = html_to_text(content)
    content = clean_text(content)

    if not content or len(content) < 200:
        raise JobExtractionError("Could not extract sufficient content from the job posting.")

    return content


def extract_job_posting(url: str) -> dict:
    html = fetch_html(url)
    job_description = extract_job_description_from_html(html)
    metadata = extract_job_metadata(html=html, url=url)
    return {
        "job_description": job_description,
        "job_title": metadata.get("job_title", ""),
        "company_name": metadata.get("company_name", ""),
    }


def extract_job_description(url: str) -> str:
    return extract_job_posting(url)["job_description"]
