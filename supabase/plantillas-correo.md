# Plantillas de correo de Supabase

Dónde pegarlas: Supabase > tu proyecto > **Authentication** > **Emails** (o **Email Templates**).
Hay que cambiar tres plantillas. En cada una: pegar el **asunto** en *Subject* y el **contenido** en *Message body* (modo HTML / Source), y pulsar **Save**.

Los enlaces usan `{{ .SiteURL }}`, que es la dirección de la app (ahora `http://localhost:3000`; al publicar se cambia por la definitiva en Authentication > URL Configuration > Site URL).

---

## 1. Confirm sign up (confirmar registro)

**Asunto:** `Confirma tu cuenta · Confirm your account`

```html
<h2>Confirma tu cuenta</h2>
<p>Pulsa el botón para confirmar tu correo y continuar.</p>
<p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=signup">Confirmar cuenta</a></p>
<hr>
<h2>Confirm your account</h2>
<p>Press the button to confirm your email and continue.</p>
<p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=signup">Confirm account</a></p>
```

## 2. Invite user (invitación de alumno)

**Asunto:** `Te damos la bienvenida · Welcome`

```html
<h2>Te damos la bienvenida</h2>
<p>Miriam del Olmo te ha dado de alta. Pulsa el botón para elegir tu contraseña.</p>
<p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite">Elegir contraseña</a></p>
<hr>
<h2>Welcome</h2>
<p>Miriam del Olmo has created your account. Press the button to choose your password.</p>
<p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite">Choose password</a></p>
```

## 3. Reset password (recuperar contraseña)

**Asunto:** `Elige una contraseña nueva · Choose a new password`

```html
<h2>Contraseña nueva</h2>
<p>Pulsa el botón para elegir una contraseña nueva.</p>
<p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery">Elegir contraseña</a></p>
<hr>
<h2>New password</h2>
<p>Press the button to choose a new password.</p>
<p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery">Choose password</a></p>
```
