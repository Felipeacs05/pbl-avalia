package com.uefs.tfs.avaliasystem.service;

import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class EmailTemplateService {

    //isso aq serve pra ele carregar os emails em resource/templates
    //ele tb mantem carregado dps de carregar os emaisl ao inicialçizar pra evitar gargalos
    private static final String TEMPLATE_LOCATION = "classpath:templates/email/%s.html";
    private static final String PLACEHOLDER_START = "{{";
    private static final String PLACEHOLDER_END = "}}";

    private final ResourceLoader resourceLoader;
    //mantem eles carregados aqui
    private final ConcurrentMap<String, String> templateCache = new ConcurrentHashMap<>();

    public EmailTemplateService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    public String render(String templateName, Map<String, String> values) {
        String template = templateCache.computeIfAbsent(templateName, this::loadTemplate);

        for (Map.Entry<String, String> value : values.entrySet()) {
            template = template.replace(
                    PLACEHOLDER_START + value.getKey() + PLACEHOLDER_END,
                    HtmlUtils.htmlEscape(value.getValue())
            );
        }

        if (template.contains(PLACEHOLDER_START) || template.contains(PLACEHOLDER_END)) {
            throw new IllegalArgumentException("Marcador não substituído no modelo de e-mail: " + templateName);
        }

        return template;
    }

    private String loadTemplate(String templateName) {
        Resource resource = resourceLoader.getResource(TEMPLATE_LOCATION.formatted(templateName));
        try (var inputStream = resource.getInputStream()) {
            return StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException("Falha ao carregar o modelo de e-mail: " + templateName, exception);
        }
    }
}
