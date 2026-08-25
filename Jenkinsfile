pipeline {
  agent any

  triggers {
    pollSCM('H/5 * * * *')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install and test') {
      steps {
        sh 'docker run --rm -v "$WORKSPACE:/app" -w /app node:24-bookworm bash -lc "npm install && npm run check"'
      }
    }

    stage('Build production image') {
      steps {
        sh 'docker build -f docker/webapp/Dockerfile -t postiliste:${BUILD_NUMBER} .'
      }
    }

    stage('Deploy local production') {
      steps {
        sh 'docker compose up -d --build --remove-orphans'
      }
    }
  }
}
