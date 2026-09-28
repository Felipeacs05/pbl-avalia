package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomResponse createRoom(@RequestBody @Valid RoomRequest request, Principal principal) {
        ensureAuthenticated(principal);
        return roomService.createRoom(request, principal.getName());
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public RoomResponse updateRoom(@PathVariable String id, @RequestBody @Valid RoomRequest request, Principal principal) {
        ensureAuthenticated(principal);
        return roomService.updateRoom(id, request, principal.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRoom(@PathVariable String id, Principal principal) {
        ensureAuthenticated(principal);
        roomService.deleteRoom(id, principal.getName());
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<RoomResponse> listRooms(Principal principal) {
        ensureAuthenticated(principal);
        return roomService.listRooms(principal.getName());
    }

    private void ensureAuthenticated(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new SecurityException("Acesso não autorizado: credenciais ausentes.");
        }
    }
}