.PHONY: all build push clean test

all: build

build:
	docker build -f .devops/Dockerfile -t chetanbohra26/react-socket-chat:latest .

push:
	docker push chetanbohra26/react-socket-chat:latest

clean:
	docker rmi chetanbohra26/react-socket-chat:latest 2>/dev/null || true

test:
	npm test -- --watchAll=false
