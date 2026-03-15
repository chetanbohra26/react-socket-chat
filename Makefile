build:
	docker build -f .devops/Dockerfile -t chetanbohra26/react-socket-chat:latest .

push:
	docker push chetanbohra26/react-socket-chat:latest
