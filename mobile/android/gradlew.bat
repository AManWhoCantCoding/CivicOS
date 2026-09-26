@rem
@rem Copyright 2015 the original author or authors.
@rem
@echo off
setlocal
set DIR=%~dp0
set APP_HOME=%DIR%
set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
if defined JAVA_HOME set JAVA_EXE=%JAVA_HOME%\bin\java.exe
if not defined JAVA_EXE set JAVA_EXE=java.exe
"%JAVA_EXE%" -Dorg.gradle.appname=gradlew -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
if %ERRORLEVEL% EQU 0 goto end
exit /b %ERRORLEVEL%
:end
endlocal
