# Konfiguracja Azure Easy Auth dla GitHub Pages

Frontend jest hostowany na GitHub Pages:

```text
https://ziomus1357.github.io/HairSalonBookingFrontend/
```

Backend Azure App Service:

```text
https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net
```

## 1. CORS backendu

W Azure Portal przejdz do:

```text
App Services -> booking-api -> API -> CORS
```

Dodaj allowed origin:

```text
https://ziomus1357.github.io
```

Wazne:

- bez koncowego `/`,
- bez `/HairSalonBookingFrontend`,
- jesli jest opcja credentials/support credentials, wlacz ja.

## 2. Authentication backendu

W Azure Portal przejdz do:

```text
App Services -> booking-api -> Authentication
```

Ustaw:

```text
App Service authentication: Enabled
Unauthenticated requests: Allow unauthenticated requests
```

Publiczne endpointy aplikacji musza dzialac dla goscia, dlatego nie ustawiaj globalnego wymuszania logowania.

## 3. Allowed external redirect URLs

W:

```text
App Services -> booking-api -> Authentication
```

znajdz:

```text
Allowed external redirect URLs
```

Dodaj:

```text
https://ziomus1357.github.io/HairSalonBookingFrontend/auth/callback
```

To jest adres, na ktory Azure Easy Auth ma wrocic po udanym logowaniu.

## 4. GitHub provider

Jesli uzywasz logowania GitHub, w Azure sprawdz:

```text
App Services -> booking-api -> Authentication -> Identity providers -> GitHub
```

Provider powinien byc dodany.

W GitHub Developer Settings / OAuth App ustaw callback na backend:

```text
https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net/.auth/login/github/callback
```

Nie ustawiaj callbacka GitHuba na GitHub Pages.

## 5. Google provider

Jesli uzywasz logowania Google, w Azure sprawdz:

```text
App Services -> booking-api -> Authentication -> Identity providers -> Google
```

W Google Cloud Console ustaw callback na backend:

```text
https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net/.auth/login/google/callback
```

Nie ustawiaj callbacka Google na GitHub Pages.

## 6. Test reczny Easy Auth

Google:

```text
https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net/.auth/login/google?post_login_redirect_uri=https%3A%2F%2Fziomus1357.github.io%2FHairSalonBookingFrontend%2Fauth%2Fcallback
```

GitHub:

```text
https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net/.auth/login/github?post_login_redirect_uri=https%3A%2F%2Fziomus1357.github.io%2FHairSalonBookingFrontend%2Fauth%2Fcallback
```

Po logowaniu Azure powinien wrocic do:

```text
https://ziomus1357.github.io/HairSalonBookingFrontend/auth/callback
```

## 7. Test z aplikacji

Wejdz na:

```text
https://ziomus1357.github.io/HairSalonBookingFrontend/
```

Nastepnie:

1. Kliknij `Zaloguj`.
2. Wybierz Google albo GitHub.
3. Zaloguj sie przez providera.
4. Sprawdz, czy aplikacja wraca na `/auth/callback`.
5. Frontend powinien odczytac `/api/Auth/me`.
6. Aplikacja powinna przekierowac uzytkownika wedlug roli.

## 8. Typowe problemy

### Po logowaniu nadal widzisz goscia

Sprawdz w DevTools -> Network:

```text
/api/Auth/me
```

Mozliwe przyczyny:

- brakuje CORS dla `https://ziomus1357.github.io`,
- credentials/cookies nie przechodza,
- przegladarka blokuje third-party cookies,
- uzytkownik nie istnieje jeszcze w Cosmos `users`,
- backend nie mapuje poprawnie providera na uzytkownika.

### Blad redirectu po logowaniu

Najczestsza przyczyna: brakuje tego wpisu w Azure:

```text
Allowed external redirect URLs:
https://ziomus1357.github.io/HairSalonBookingFrontend/auth/callback
```

### Publiczne API przestaje dzialac

Sprawdz, czy w Authentication nadal jest:

```text
Unauthenticated requests: Allow unauthenticated requests
```

## 9. Najwazniejsze adresy

CORS:

```text
https://ziomus1357.github.io
```

Allowed external redirect:

```text
https://ziomus1357.github.io/HairSalonBookingFrontend/auth/callback
```

GitHub callback:

```text
https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net/.auth/login/github/callback
```

Google callback:

```text
https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net/.auth/login/google/callback
```
