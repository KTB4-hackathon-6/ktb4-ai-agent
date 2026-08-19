from pydantic import BaseModel


class LawArticle(BaseModel):
    law_name: str
    article_number: str
    text: str
