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

    stage('Build CI test image') {
      steps {
        sh 'docker build --target test -f docker/webapp/Dockerfile -t postiliste:test-${BUILD_NUMBER} .'
      }
    }

    stage('Unit and integration tests') {
      steps {
        sh 'docker run --rm postiliste:test-${BUILD_NUMBER}'
      }
    }

    stage('Build production image') {
      steps {
        sh 'docker build --target production -f docker/webapp/Dockerfile -t postiliste:${BUILD_NUMBER} .'
      }
    }

    stage('Deploy local production') {
      steps {
        sh 'docker compose up -d --build --remove-orphans'
        sh 'docker compose ps'
      }
    }
  }
}
