# Build stage
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Baixa dependências primeiro (camada em cache enquanto o pom.xml não mudar)
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true

# Copia apenas o código de produção (src/test é ignorado via .dockerignore)
COPY src ./src

# -Dmaven.test.skip=true NÃO compila nem executa testes.
# A imagem só depende do que está implementado em src/main; testes de
# funcionalidades ainda não implementadas (TDD) não quebram o build.
# Os testes continuam sendo responsabilidade do CI / `mvn test` local.
RUN mvn -B clean package -Dmaven.test.skip=true

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
