---
title: Autokrator
startDate: 2017-10-18
endDate: 2018-03-21
ongoing: false

links:
  - link: https://github.com/autokrator-uog
    text: View Source
  - link: /media/autokrator_dissertation.pdf
    text: View Dissertation
  - link: /media/autokrator_presentation.pdf
    text: View Presentation

type: University Team Project
typeColour: carrot

category:
  name: Projects
  key: projects
location:
  company: University of Glasgow
  city: Glasgow, Scotland

hideOnWeb: false
hideOnCV: false

tags:
  - Rust
  - Python
  - Java
  - JavaScript
  - Bash
  - Lua
  - LaTeX
  - Semantic UI
  - Flask
  - Docker
  - Websockets
  - Maven
  - PostgreSQL
  - Redis
  - Kafka
  - Couchbase
  - REST
  - HTTP
---
As part of my third year at the University of Glasgow, four other students and I were tasked with creating a event-sourced financial platform for [Avaloq](https://avaloq.com/). Our completed application - Autokrator - consists of many components: a central event bus; a microservice framework, the superclient; a backend gateway and a UI. It was required that our application contain a central event bus, three microservices and a small web application that demonstrates the system working. Further, it was required that events had consistency; that multiple instances of each service could run at once and work together; that events would be redelivered if a service crashed during processing; and that each service's ephemeral storage could be rebuilt from the event bus if destroyed.

In particular, I managed and led development on the event bus and the superclient. The event bus, written in Rust, is the central server that manages and persists events while ensuring consistency, correlation and that microservice clients can scale horizontally. The superclient, also written in Rust, is a framework for building clients in Lua with persistence and a REST API.

This involved working with the team to design and implement the various solutions that allowed the system to achieve the desired properties; to streamline and improve our development processes; and to mentor other team members in fixing bugs and building features when working with unfamiliar technologies.
