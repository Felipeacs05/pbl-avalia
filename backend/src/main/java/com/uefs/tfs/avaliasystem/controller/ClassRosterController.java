package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.ClassRosterDTO;
import com.uefs.tfs.avaliasystem.dto.PageResponse;
import com.uefs.tfs.avaliasystem.service.ClassRosterService;
import com.uefs.tfs.avaliasystem.util.PaginationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/roster")
@RequiredArgsConstructor
public class ClassRosterController {

    private final ClassRosterService service;

    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    @GetMapping
    public ResponseEntity<PageResponse<ClassRosterDTO>> getRoster(
            @PathVariable UUID roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Principal principal) {
        return ResponseEntity.ok(service.getRoster(
                roomId,
                UUID.fromString(principal.getName()),
                PaginationUtils.safePageable(page, size)));
    }
}