import json
import os
import uuid
from datetime import datetime, timezone

import boto3

TABLE_NAME = os.environ.get("TABLE_NAME", "MyMicroProjectTable")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def _resp(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body),
    }


def _path_params(event):
    return event.get("pathParameters") or {}


def _body(event):
    raw = event.get("body")
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}


def create_task(data):
    task_id = data.get("id") or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "id": task_id,
        "title": data.get("title", "Untitled task"),
        "description": data.get("description", ""),
        "status": data.get("status", "todo"),
        "priority": data.get("priority", "medium"),
        "createdAt": now,
        "updatedAt": now,
    }
    table.put_item(Item=item)
    return item


def list_tasks():
    result = table.scan()
    items = result.get("Items", [])
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"items": items, "count": len(items)}


def get_task(task_id):
    result = table.get_item(Key={"id": task_id})
    item = result.get("Item")
    if not item:
        return None
    return item


def update_task(task_id, data):
    existing = get_task(task_id)
    if not existing:
        return None
    now = datetime.now(timezone.utc).isoformat()
    item = dict(existing)
    item.update({
        "title": data.get("title", item.get("title")),
        "description": data.get("description", item.get("description")),
        "status": data.get("status", item.get("status")),
        "priority": data.get("priority", item.get("priority")),
        "updatedAt": now,
    })
    table.put_item(Item=item)
    return item


def delete_task(task_id):
    table.delete_item(Key={"id": task_id})
    return {"id": task_id, "deleted": True}


def lambda_handler(event, context):
    try:
        method = (event.get("httpMethod") or "").upper()
        params = _path_params(event)
        data = _body(event)

        if method == "OPTIONS":
            return _resp(200, {"ok": True})

        if method == "POST" and not params.get("id"):
            return _resp(201, create_task(data))

        if method == "GET" and not params.get("id"):
            return _resp(200, list_tasks())

        if method == "GET" and params.get("id"):
            item = get_task(params["id"])
            if item is None:
                return _resp(404, {"error": "task not found"})
            return _resp(200, item)

        if method == "PUT" and params.get("id"):
            item = update_task(params["id"], data)
            if item is None:
                return _resp(404, {"error": "task not found"})
            return _resp(200, item)

        if method == "DELETE" and params.get("id"):
            delete_task(params["id"])
            return _resp(200, {"id": params["id"], "deleted": True})

        return _resp(400, {"error": "unsupported route", "method": method, "path": event.get("path")})
    except Exception as exc:
        return _resp(500, {"error": "internal error", "detail": str(exc)})