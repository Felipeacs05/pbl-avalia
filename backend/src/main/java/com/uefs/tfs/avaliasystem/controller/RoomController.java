package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.JoinRoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.dto.RoomMemberResponse;
import com.uefs.tfs.avaliasystem.service.RoomService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomResponse createRoom(@RequestBody @Valid RoomRequest request, Principal principal) {
        return roomService.createRoom(request, userId(principal));
    }

    @PreAuthorize("@roomSecurity.isOwner(#id, authentication)")
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public RoomResponse updateRoom(@PathVariable UUID id, @RequestBody @Valid RoomRequest request, Principal principal) {
        return roomService.updateRoom(id, request, userId(principal));
    }

    @PreAuthorize("@roomSecurity.isOwner(#id, authentication)")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRoom(@PathVariable UUID id, Principal principal) {
        roomService.deleteRoom(id, userId(principal));
    }

    // Retorna apenas as salas criadas pelo professor logado
    @GetMapping({"", "/tutor"})
    @ResponseStatus(HttpStatus.OK)
    public List<RoomResponse> listRoomsAsTutor(Principal principal) {
        return roomService.listRoomsAsTutor(userId(principal));
    }

    // Retorna apenas as turmas em que o aluno está matriculado
    @GetMapping("/student")
    @ResponseStatus(HttpStatus.OK)
    public List<RoomResponse> listRoomsAsStudent(Principal principal) {
        return roomService.listRoomsAsStudent(userId(principal));
    }

    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("@roomSecurity.isRoomMemberOrOwner(#id, authentication)")
    public RoomResponse getRoomById(@PathVariable UUID id) {
        return roomService.getRoomById(id);
    }

    @DeleteMapping("/{roomId}/members/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveRoom(@PathVariable UUID roomId, Principal principal) {
        roomService.leaveRoom(roomId, userId(principal));
    }

    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    @DeleteMapping({"/{roomId}/members/{studentId}", "/{roomId}/students/{studentId}"})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeStudentFromRoom(@PathVariable UUID roomId,
                                      @PathVariable UUID studentId,
                                      Principal principal) {
        roomService.removeStudentFromRoom(roomId, studentId, userId(principal));
    }

    @GetMapping("/{roomId}/members")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("@roomSecurity.isRoomMemberOrOwner(#roomId, authentication)")
    public List<RoomMemberResponse> listRoomMembers(@PathVariable UUID roomId) {
        return roomService.listRoomMembers(roomId);
    }

    @PostMapping("/join")
    @ResponseStatus(HttpStatus.OK)
    public RoomResponse joinRoom(@RequestBody @Valid JoinRoomRequest request,
                                 Principal principal,
                                 HttpServletRequest httpRequest) {
        return roomService.joinRoom(userId(principal), request.getAccessCode(), resolveClientIp(httpRequest));
    }

    @PostMapping("/join/{code}")
    @ResponseStatus(HttpStatus.OK)
    public RoomResponse joinRoomByLink(@PathVariable String code,
                                       Principal principal,
                                       HttpServletRequest httpRequest) {
        return roomService.joinRoom(userId(principal), code, resolveClientIp(httpRequest));
    }

    private UUID userId(Principal principal) {
        System.out.println("🔍 [DEBUG] Principal Name (sub do JWT): " + principal.getName());
        return UUID.fromString(principal.getName());
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
