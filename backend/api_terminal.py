#!/usr/bin/env python3
"""Cliente interativo de terminal para testar todas as rotas do backend."""

import base64
import json
import mimetypes
import os
import sys
import time
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "http://localhost:8080"

DEFAULTS = {
    "name": "Teste Terminal",
    "email": "teste@email.com",
    "password": "Senha123!",
    "photo": r"C:\Users\User\Downloads\download.png",
    "room_name": "Sala de Teste",
    "room_id": "00000000-0000-0000-0000-000000000000",
    "access_code": "ABC123",
    "group_name": "Grupo de Teste",
    "group_id": "00000000-0000-0000-0000-000000000000",
    "student_id": "00000000-0000-0000-0000-000000000000",
    "problem_title": "Problema de Teste",
    "problem_id": "00000000-0000-0000-0000-000000000000",
    "table_name": "Tabela de Desempenho",
    "performance_table_id": "00000000-0000-0000-0000-000000000000",
    "criterion_id": "00000000-0000-0000-0000-000000000000",
    "criterion_name": "Participacao",
    "criterion_description": "Participacao durante a sessao",
    "criterion_weight": 1.0,
}

state = {
    "token": None,
    "user_id": None,
    "room_id": DEFAULTS["room_id"],
    "access_code": DEFAULTS["access_code"],
    "group_id": DEFAULTS["group_id"],
    "student_id": DEFAULTS["student_id"],
    "problem_id": DEFAULTS["problem_id"],
    "performance_table_id": DEFAULTS["performance_table_id"],
    "criterion_id": DEFAULTS["criterion_id"],
    "other_user_id": None,
    "other_user_email": None,
    "other_user_password": None,
    "other_room_id": None,
    "other_room_access_code": None,
}


def print_json(value):
    print(json.dumps(value, indent=2, ensure_ascii=False))


def choose(title, options):
    while True:
        print(f"\n=== {title} ===")
        for key, label in options.items():
            print(f"{key} - {label}")
        selected = input("> ").strip()
        if selected in options:
            return selected
        print("Opcao invalida.")


def input_text(label, default=None, required=True):
    suffix = f" [{default}]" if default not in (None, "") else ""
    while True:
        value = input(f"{label}{suffix}: ").strip()
        if value:
            return value
        if default is not None:
            return str(default)
        if not required:
            return ""
        print("Este campo e obrigatorio.")


def input_number(label, default):
    while True:
        value = input_text(label, default)
        try:
            return float(value)
        except ValueError:
            print("Digite um numero valido.")


def input_integer(label, default, minimum=1):
    while True:
        value = input_text(label, default)
        try:
            number = int(value)
            if number >= minimum:
                return number
        except ValueError:
            pass
        print(f"Digite um numero inteiro maior ou igual a {minimum}.")


def data_mode():
    return choose("Dados", {
        "0": "Voltar",
        "1": "Usar dados previamente selecionados",
        "2": "Preencher manualmente",
    })


def show_request(method, path, body=None, extra=None):
    print(f"\n{method} {BASE_URL}{path}")
    if body is not None:
        print("JSON enviado:")
        print_json(body)
    if extra:
        print(extra)


def decode_user_id(token):
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
        return claims.get("sub")
    except Exception:
        return None


def capture_response(kind, data):
    if not isinstance(data, dict):
        return

    if kind == "register":
        state["user_id"] = data.get("id") or state["user_id"]
    elif kind == "login":
        state["token"] = data.get("token") or state["token"]
        state["user_id"] = decode_user_id(state["token"]) or state["user_id"]
    elif kind == "room":
        state["room_id"] = data.get("id") or state["room_id"]
        state["access_code"] = data.get("code") or state["access_code"]
    elif kind == "group":
        state["group_id"] = data.get("id") or state["group_id"]
        state["room_id"] = data.get("roomId") or state["room_id"]
    elif kind == "problem":
        state["problem_id"] = data.get("id") or state["problem_id"]
    elif kind == "table":
        state["performance_table_id"] = data.get("performanceTableId") or state["performance_table_id"]
        state["room_id"] = data.get("roomId") or state["room_id"]
        criteria = data.get("criteriaList") or []
        if criteria:
            state["criterion_id"] = criteria[0].get("criterionId") or state["criterion_id"]
    elif kind == "criterion":
        state["criterion_id"] = data.get("criterionId") or state["criterion_id"]


def request(method, path, body=None, authenticated=True, capture=None, headers=None):
    request_headers = {"Accept": "application/json"}
    if headers:
        request_headers.update(headers)

    encoded_body = None
    if body is not None:
        request_headers.setdefault("Content-Type", "application/json")
        encoded_body = json.dumps(body).encode("utf-8")

    if authenticated:
        if not state["token"]:
            print("\nNenhum token carregado. Faca login primeiro.")
            return None
        request_headers["Authorization"] = f"Bearer {state['token']}"

    show_request(method, path, body)
    req = Request(BASE_URL + path, data=encoded_body, headers=request_headers, method=method)

    try:
        with urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
            print(f"\nHTTP {response.status}")
            if not raw:
                print("(resposta sem corpo)")
                return None
            try:
                data = json.loads(raw)
                print_json(data)
                capture_response(capture, data)
                return data
            except json.JSONDecodeError:
                print(raw)
                return raw
    except HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        print(f"\nHTTP {error.code}")
        try:
            print_json(json.loads(raw))
        except json.JSONDecodeError:
            print(raw or "(resposta sem corpo)")
    except URLError as error:
        print(f"\nNao foi possivel conectar ao backend: {error.reason}")
    return None


def multipart_register(data, photo_path):
    if not os.path.isfile(photo_path):
        print(f"\nArquivo de foto nao encontrado: {os.path.abspath(photo_path)}")
        return None

    boundary = f"----AvaliaTerminal{uuid.uuid4().hex}"
    photo_type = mimetypes.guess_type(photo_path)[0] or "application/octet-stream"
    photo_name = os.path.basename(photo_path)
    parts = []

    parts.append(f"--{boundary}\r\n".encode())
    parts.append(b'Content-Disposition: form-data; name="data"\r\n')
    parts.append(b"Content-Type: application/json; charset=utf-8\r\n\r\n")
    parts.append(json.dumps(data, ensure_ascii=False).encode("utf-8"))
    parts.append(b"\r\n")

    parts.append(f"--{boundary}\r\n".encode())
    parts.append(f'Content-Disposition: form-data; name="photo"; filename="{photo_name}"\r\n'.encode())
    parts.append(f"Content-Type: {photo_type}\r\n\r\n".encode())
    with open(photo_path, "rb") as photo:
        parts.append(photo.read())
    parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())

    body = b"".join(parts)
    path = "/api/v1/auth/register"
    show_request("POST", path, data, f"Foto: {os.path.abspath(photo_path)}")
    req = Request(
        BASE_URL + path,
        data=body,
        headers={
            "Accept": "application/json",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            print(f"\nHTTP {response.status}")
            result = json.loads(raw) if raw else None
            print_json(result)
            capture_response("register", result)
            return result
    except HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        print(f"\nHTTP {error.code}")
        try:
            print_json(json.loads(raw))
        except json.JSONDecodeError:
            print(raw or "(resposta sem corpo)")
    except URLError as error:
        print(f"\nNao foi possivel conectar ao backend: {error.reason}")
    return None


def value(mode, key, label):
    if mode == "1":
        return state.get(key) or DEFAULTS[key]
    return input_text(label, state.get(key) or DEFAULTS.get(key))


def auth_menu():
    action = choose("Autenticacao", {"0": "Voltar", "1": "Cadastrar", "2": "Login"})
    if action == "0":
        return
    mode = data_mode()
    if mode == "0":
        return

    if action == "1":
        if mode == "1":
            data = {"name": DEFAULTS["name"], "email": DEFAULTS["email"], "password": DEFAULTS["password"]}
            photo = DEFAULTS["photo"]
        else:
            data = {
                "name": input_text("Nome", DEFAULTS["name"]),
                "email": input_text("Email", DEFAULTS["email"]),
                "password": input_text("Senha", DEFAULTS["password"]),
            }
            photo = input_text("Caminho da foto", DEFAULTS["photo"])
        multipart_register(data, photo)
    else:
        data = {
            "email": DEFAULTS["email"] if mode == "1" else input_text("Email", DEFAULTS["email"]),
            "password": DEFAULTS["password"] if mode == "1" else input_text("Senha", DEFAULTS["password"]),
        }
        request("POST", "/api/v1/auth/login", data, authenticated=False, capture="login")


def dashboard_menu():
    action = choose("Dashboard", {"0": "Voltar", "1": "Listar minhas salas"})
    if action == "1":
        request("GET", "/api/v1/users/me/rooms")


def rooms_menu():
    action = choose("Salas", {
        "0": "Voltar", "1": "Criar", "2": "Editar", "3": "Excluir",
        "4": "Listar", "5": "Entrar por codigo", "6": "Entrar por link",
        "7": "Criar usuarios e popular a sala automaticamente",
        "8": "Listar membros da sala",
        "9": "Criar outro usuario e uma sala para ele",
    })
    if action == "0":
        return
    if action == "4":
        request("GET", "/api/v1/rooms")
        return
    mode = data_mode()
    if mode == "0":
        return

    if action == "1":
        name = DEFAULTS["room_name"] if mode == "1" else input_text("Nome da sala", DEFAULTS["room_name"])
        request("POST", "/api/v1/rooms", {"name": name}, capture="room")
    elif action == "2":
        room_id = value(mode, "room_id", "ID da sala")
        name = DEFAULTS["room_name"] if mode == "1" else input_text("Novo nome", DEFAULTS["room_name"])
        request("PUT", f"/api/v1/rooms/{room_id}", {"name": name}, capture="room")
    elif action == "3":
        room_id = value(mode, "room_id", "ID da sala")
        request("DELETE", f"/api/v1/rooms/{room_id}")
    elif action == "5":
        code = value(mode, "access_code", "Codigo de acesso")
        request("POST", "/api/v1/rooms/join", {"accessCode": code}, capture="room")
    elif action == "6":
        code = value(mode, "access_code", "Codigo de acesso")
        request("POST", f"/api/v1/rooms/join/{code}", capture="room")
    elif action == "7":
        populate_room(mode)
    elif action == "8":
        room_id = value(mode, "room_id", "ID da sala")
        request("GET", f"/api/v1/rooms/{room_id}/members")
    elif action == "9":
        create_room_as_another_user(mode)


def create_room_as_another_user(mode):
    """Cadastra outro usuário, autentica, cria sua sala e restaura a sessão anterior."""
    unique_suffix = int(time.time())

    if mode == "1":
        user_data = {
            "name": "Outro Tutor",
            "email": f"outro.tutor.{unique_suffix}@example.com",
            "password": DEFAULTS["password"],
        }
        photo = DEFAULTS["photo"]
        room_name = "Sala do Outro Tutor"
    else:
        user_data = {
            "name": input_text("Nome do outro usuario", "Outro Tutor"),
            "email": input_text("Email", f"outro.tutor.{unique_suffix}@example.com"),
            "password": input_text("Senha", DEFAULTS["password"]),
        }
        photo = input_text("Caminho da foto", DEFAULTS["photo"])
        room_name = input_text("Nome da sala", "Sala do Outro Tutor")

    print("\nDados da macro:")
    print_json({
        "user": user_data,
        "photo": os.path.abspath(photo),
        "room": {"name": room_name},
    })

    original_state = dict(state)
    result = None

    try:
        registered = multipart_register(user_data, photo)
        if not registered:
            print("\nNao foi possivel cadastrar o outro usuario.")
            return

        logged_in = request(
            "POST",
            "/api/v1/auth/login",
            {"email": user_data["email"], "password": user_data["password"]},
            authenticated=False,
            capture="login",
        )
        if not logged_in or not state["token"]:
            print("\nNao foi possivel autenticar o outro usuario.")
            return

        created_room = request(
            "POST",
            "/api/v1/rooms",
            {"name": room_name},
            capture="room",
        )
        if not created_room:
            print("\nNao foi possivel criar a sala do outro usuario.")
            return

        result = {
            "userId": registered.get("id"),
            "name": registered.get("name"),
            "email": user_data["email"],
            "password": user_data["password"],
            "roomId": created_room.get("id"),
            "roomName": created_room.get("name"),
            "accessCode": created_room.get("code"),
            "joinLink": created_room.get("joinLink"),
        }
    finally:
        state.clear()
        state.update(original_state)

    if result:
        state["other_user_id"] = result["userId"]
        state["other_user_email"] = result["email"]
        state["other_user_password"] = result["password"]
        state["other_room_id"] = result["roomId"]
        state["other_room_access_code"] = result["accessCode"]
        print("\n=== Outro usuario e sala criados ===")
        print_json(result)
        print("\nO token que estava ativo antes da macro foi restaurado.")


def populate_room(mode):
    """Cria alunos, autentica cada um e os adiciona à sala sem interação repetida."""
    if mode == "1":
        count = 3
        code = state["access_code"] or DEFAULTS["access_code"]
        photo = DEFAULTS["photo"]
        email_prefix = "aluno.terminal"
        password = DEFAULTS["password"]
    else:
        count = input_integer("Quantidade de usuarios", 3)
        code = input_text("Codigo de acesso da sala", state["access_code"] or DEFAULTS["access_code"])
        photo = input_text("Caminho da foto usada por todos", DEFAULTS["photo"])
        email_prefix = input_text("Prefixo dos emails", "aluno.terminal")
        password = input_text("Senha usada por todos", DEFAULTS["password"])

    plan = {
        "quantity": count,
        "accessCode": code,
        "emailPattern": f"{email_prefix}.<lote>.<numero>@example.com",
        "password": password,
        "photo": os.path.abspath(photo),
    }
    print("\nDados da populacao:")
    print_json(plan)

    if not os.path.isfile(photo):
        print(f"\nArquivo de foto nao encontrado: {os.path.abspath(photo)}")
        return

    original_state = dict(state)
    batch = int(time.time())
    results = []

    try:
        for number in range(1, count + 1):
            email = f"{email_prefix}.{batch}.{number}@example.com"
            register_data = {
                "name": f"Aluno Terminal {number}",
                "email": email,
                "password": password,
            }

            print(f"\n--- Usuario {number}/{count}: {email} ---")
            registered = multipart_register(register_data, photo)
            if not registered:
                results.append({"email": email, "status": "falha no cadastro"})
                continue

            logged_in = request(
                "POST",
                "/api/v1/auth/login",
                {"email": email, "password": password},
                authenticated=False,
                capture="login",
            )
            if not logged_in or not state["token"]:
                results.append({"email": email, "id": registered.get("id"), "status": "falha no login automatico"})
                continue

            joined = request(
                "POST",
                "/api/v1/rooms/join",
                {"accessCode": code},
                capture="room",
            )
            results.append({
                "email": email,
                "password": password,
                "id": registered.get("id"),
                "status": "adicionado" if joined else "falha ao entrar na sala",
            })
    finally:
        state.clear()
        state.update(original_state)

    print("\n=== Resultado da populacao ===")
    print_json(results)
    print("\nO token que estava ativo antes da operacao foi restaurado.")


def member_ids(mode):
    if mode == "1":
        return [state["student_id"]]
    raw = input_text("IDs dos membros separados por virgula", "", required=False)
    return [item.strip() for item in raw.split(",") if item.strip()]


def groups_menu():
    action = choose("Grupos", {
        "0": "Voltar", "1": "Criar", "2": "Listar", "3": "Editar",
        "4": "Excluir", "5": "Adicionar membro", "6": "Remover membro",
        "7": "Consultar meu grupo", "8": "Listar alunos disponiveis",
    })
    if action == "0":
        return
    mode = data_mode()
    if mode == "0":
        return
    room_id = value(mode, "room_id", "ID da sala")

    if action == "1":
        name = DEFAULTS["group_name"] if mode == "1" else input_text("Nome do grupo", DEFAULTS["group_name"])
        request("POST", f"/api/v1/rooms/{room_id}/groups", {"name": name, "memberIds": member_ids(mode)}, capture="group")
    elif action == "2":
        request("GET", f"/api/v1/rooms/{room_id}/groups")
    elif action == "3":
        group_id = value(mode, "group_id", "ID do grupo")
        name = DEFAULTS["group_name"] if mode == "1" else input_text("Novo nome", DEFAULTS["group_name"])
        request("PATCH", f"/api/v1/rooms/{room_id}/groups/{group_id}", {"name": name, "memberIds": member_ids(mode)}, capture="group")
    elif action == "4":
        group_id = value(mode, "group_id", "ID do grupo")
        request("DELETE", f"/api/v1/rooms/{room_id}/groups/{group_id}")
    elif action == "5":
        group_id = value(mode, "group_id", "ID do grupo")
        student_id = value(mode, "student_id", "ID do aluno")
        request("POST", f"/api/v1/rooms/{room_id}/groups/{group_id}/members", {"studentId": student_id}, capture="group")
    elif action == "6":
        group_id = value(mode, "group_id", "ID do grupo")
        student_id = value(mode, "student_id", "ID do aluno")
        request("DELETE", f"/api/v1/rooms/{room_id}/groups/{group_id}/members/{student_id}")
    elif action == "7":
        request("GET", f"/api/v1/rooms/{room_id}/groups/me", capture="group")
    elif action == "8":
        request("GET", f"/api/v1/rooms/{room_id}/groups/available-students")


def problems_menu():
    action = choose("Problemas", {"0": "Voltar", "1": "Criar", "2": "Editar", "3": "Excluir", "4": "Listar por sala"})
    if action == "0":
        return
    mode = data_mode()
    if mode == "0":
        return

    if action in ("1", "4"):
        room_id = value(mode, "room_id", "ID da sala")
    if action in ("2", "3"):
        problem_id = value(mode, "problem_id", "ID do problema")

    if action == "1":
        title = DEFAULTS["problem_title"] if mode == "1" else input_text("Titulo", DEFAULTS["problem_title"])
        request("POST", f"/api/v1/rooms/{room_id}/problems", {"title": title}, capture="problem")
    elif action == "2":
        title = DEFAULTS["problem_title"] if mode == "1" else input_text("Novo titulo", DEFAULTS["problem_title"])
        request("PUT", f"/api/v1/problems/{problem_id}", {"title": title}, capture="problem")
    elif action == "3":
        request("DELETE", f"/api/v1/problems/{problem_id}")
    elif action == "4":
        request("GET", f"/api/v1/rooms/{room_id}/problems")


def criterion_data(mode):
    if mode == "1":
        return {
            "criteriaName": DEFAULTS["criterion_name"],
            "criteriaDescription": DEFAULTS["criterion_description"],
            "criteriaWeight": DEFAULTS["criterion_weight"],
        }
    return {
        "criteriaName": input_text("Nome do criterio", DEFAULTS["criterion_name"]),
        "criteriaDescription": input_text("Descricao", DEFAULTS["criterion_description"], required=False),
        "criteriaWeight": input_number("Peso", DEFAULTS["criterion_weight"]),
    }


def performance_tables_menu():
    action = choose("Tabelas de desempenho", {
        "0": "Voltar", "1": "Criar tabela", "2": "Consultar tabela",
        "3": "Adicionar criterio", "4": "Excluir criterio",
    })
    if action == "0":
        return
    mode = data_mode()
    if mode == "0":
        return

    if action == "1":
        room_id = value(mode, "room_id", "ID da sala")
        table_name = DEFAULTS["table_name"] if mode == "1" else input_text("Nome da tabela", DEFAULTS["table_name"])
        body = {"roomId": room_id, "tableName": table_name, "criteriaList": [criterion_data(mode)]}
        request("POST", "/api/v1/performance-tables", body, capture="table")
    elif action == "2":
        table_id = value(mode, "performance_table_id", "ID da tabela")
        request("GET", f"/api/v1/performance-tables/{table_id}", capture="table")
    elif action == "3":
        table_id = value(mode, "performance_table_id", "ID da tabela")
        request("POST", f"/api/v1/performance-tables/{table_id}/criteria", criterion_data(mode), capture="criterion")
    elif action == "4":
        table_id = value(mode, "performance_table_id", "ID da tabela")
        criterion_id = value(mode, "criterion_id", "ID do criterio")
        request("DELETE", f"/api/v1/performance-tables/{table_id}/criteria/{criterion_id}")


def show_state():
    visible = dict(state)
    if visible["token"]:
        visible["token"] = visible["token"][:30] + "..."
    print("\nDados atualmente selecionados:")
    print_json(visible)


def main():
    menus = {
        "1": auth_menu,
        "2": dashboard_menu,
        "3": rooms_menu,
        "4": groups_menu,
        "5": problems_menu,
        "6": performance_tables_menu,
        "7": show_state,
    }

    while True:
        action = choose("Avalia API - cliente de terminal", {
            "0": "Sair",
            "1": "Autenticacao",
            "2": "Dashboard",
            "3": "Salas",
            "4": "Grupos",
            "5": "Problemas",
            "6": "Tabelas de desempenho",
            "7": "Exibir dados selecionados",
        })
        if action == "0":
            print("Encerrado.")
            return
        menus[action]()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nEncerrado.")
        sys.exit(0)
