using System.Text.Json;
using Microsoft.AspNetCore.Identity;

namespace Sesi.Catalogo.Api.Gestao;

public sealed class GestaoArmazenamento
{
    public static readonly string[] Papeis =
    [
        "Aluno",
        "Suporte",
        "Monitor",
        "Tutor",
        "Administrador",
        "Gestor",
        "Editor",
        "Convidado"
    ];

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string _raiz;
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private readonly PasswordHasher<UsuarioGestaoDto> _passwordHasher = new();

    public GestaoArmazenamento(IWebHostEnvironment ambiente, IConfiguration configuracao)
    {
        _raiz = configuracao["Gestao:DiretorioDados"]
            ?? Path.Combine(ambiente.ContentRootPath, "App_Data", "gestao");
        Directory.CreateDirectory(_raiz);
    }

    public async Task<IReadOnlyList<UsuarioGestaoDto>> ListarUsuariosAsync(CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            return await CarregarUsuariosAsync(ct);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<UsuarioGestaoDto> RegistrarAlunoAsync(string nome, string email, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var usuarios = (await CarregarUsuariosAsync(ct)).ToList();
            var existente = usuarios.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
            if (existente is not null)
            {
                if (existente.Papel != "Aluno" || existente.Nome == nome.Trim()) return existente;
                var atualizado = existente with { Nome = nome.Trim() };
                usuarios[usuarios.IndexOf(existente)] = atualizado;
                await GravarAsync("usuarios.json", usuarios, ct);
                return atualizado;
            }

            var usuario = new UsuarioGestaoDto(
                Guid.NewGuid().ToString("N"), nome.Trim(), email.Trim().ToLowerInvariant(), "Aluno", true, DateTime.UtcNow);
            usuarios.Add(usuario);
            await GravarAsync("usuarios.json", usuarios, ct);
            return usuario;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<UsuarioGestaoDto> CriarContaAlunoAsync(
        string nome, string email, string senha, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var usuarios = (await CarregarUsuariosAsync(ct)).ToList();
            var usuario = usuarios.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
            if (usuario is not null && usuario.Papel != "Aluno")
                throw new InvalidOperationException("Não é possível cadastrar uma senha para este tipo de conta.");
            if (usuario is { Ativo: false })
                throw new InvalidOperationException("Esta conta está inativa. Entre em contato com o suporte.");

            var credenciais = (await LerAsync<CredencialUsuario[]>("credenciais.json", [], ct)).ToList();
            var credencialExistente = credenciais.FirstOrDefault(c =>
                c.UsuarioId == usuario?.Id);
            if (credencialExistente is not null)
                throw new InvalidOperationException("Este e-mail já possui uma conta. Faça login com a senha cadastrada; a redefinição de senha ainda não está disponível.");

            if (usuario is null)
            {
                usuario = new UsuarioGestaoDto(
                    Guid.NewGuid().ToString("N"), nome.Trim(), email.Trim().ToLowerInvariant(), "Aluno", true, DateTime.UtcNow);
                usuarios.Add(usuario);
                await GravarAsync("usuarios.json", usuarios, ct);
            }
            else if (!usuario.Nome.Equals(nome.Trim(), StringComparison.Ordinal))
            {
                var atualizado = usuario with { Nome = nome.Trim() };
                usuarios[usuarios.IndexOf(usuario)] = atualizado;
                await GravarAsync("usuarios.json", usuarios, ct);
                usuario = atualizado;
            }

            credenciais.Add(new CredencialUsuario(
                usuario.Id,
                _passwordHasher.HashPassword(usuario, senha)));
            await GravarAsync("credenciais.json", credenciais, ct);
            return usuario;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<UsuarioGestaoDto?> AutenticarAlunoAsync(string email, string senha, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var usuarios = await CarregarUsuariosAsync(ct);
            var usuario = usuarios.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
            if (usuario is null || usuario.Papel != "Aluno" || !usuario.Ativo) return null;

            var credenciais = await LerAsync<CredencialUsuario[]>("credenciais.json", [], ct);
            var credencial = credenciais.FirstOrDefault(c =>
                c.UsuarioId == usuario.Id);
            if (credencial is null) return null;

            var resultado = _passwordHasher.VerifyHashedPassword(usuario, credencial.PasswordHash, senha);
            return resultado == PasswordVerificationResult.Failed ? null : usuario;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<UsuarioGestaoDto?> ObterUsuarioPorEmailAsync(string email, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var usuarios = await CarregarUsuariosAsync(ct);
            return usuarios.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<UsuarioGestaoDto> SalvarUsuarioAsync(
        SalvarUsuarioGestaoRequest request,
        string? id,
        CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var usuarios = (await CarregarUsuariosAsync(ct)).ToList();
            var existente = id is null
                ? null
                : usuarios.FirstOrDefault(u => u.Id == id);
            if (id is not null && existente is null) throw new KeyNotFoundException("Usuário não encontrado.");
            if (existente is { Papel: "Administrador", Ativo: true } &&
                (request.Papel != "Administrador" || !request.Ativo) &&
                usuarios.Count(u => u.Papel == "Administrador" && u.Ativo) <= 1)
                throw new InvalidOperationException("Não é possível desativar ou rebaixar o último administrador ativo.");
            if (usuarios.Any(u =>
                    u.Email.Equals(request.Email.Trim(), StringComparison.OrdinalIgnoreCase) && u.Id != id))
                throw new InvalidOperationException("Já existe um usuário cadastrado com este e-mail.");

            var usuario = new UsuarioGestaoDto(
                existente?.Id ?? Guid.NewGuid().ToString("N"),
                request.Nome.Trim(),
                request.Email.Trim().ToLowerInvariant(),
                request.Papel,
                request.Ativo,
                existente?.CriadoEm ?? DateTime.UtcNow);
            if (existente is null) usuarios.Add(usuario);
            else usuarios[usuarios.IndexOf(existente)] = usuario;

            await GravarAsync("usuarios.json", usuarios, ct);
            return usuario;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<bool> ExcluirUsuarioAsync(string id, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var usuarios = (await CarregarUsuariosAsync(ct)).ToList();
            var usuario = usuarios.FirstOrDefault(u => u.Id == id);
            if (usuario is null) return false;
            if (usuario.Papel == "Administrador" &&
                usuarios.Count(u => u.Papel == "Administrador" && u.Ativo) <= 1)
                throw new InvalidOperationException("Não é possível excluir o último administrador ativo.");

            usuarios.Remove(usuario);
            await GravarAsync("usuarios.json", usuarios, ct);
            var credenciais = (await LerAsync<CredencialUsuario[]>("credenciais.json", [], ct))
                .Where(c => c.UsuarioId != usuario.Id)
                .ToArray();
            await GravarAsync("credenciais.json", credenciais, ct);
            return true;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<IReadOnlyList<PermissaoPapelDto>> ObterPermissoesAsync(CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var permissoes = await LerAsync<PermissaoPapelDto[]>("permissoes.json", [], ct);
            if (permissoes.Length > 0) return permissoes;

            PermissaoPapelDto[] iniciais =
            [
                new("Aluno", false, false, false, true),
                new("Suporte", true, true, false, true),
                new("Monitor", false, false, false, true),
                new("Tutor", false, false, false, true),
                new("Administrador", true, true, true, true),
                new("Gestor", true, true, true, true),
                new("Editor", true, true, false, true),
                new("Convidado", false, false, false, true)
            ];
            await GravarAsync("permissoes.json", iniciais, ct);
            return iniciais;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task SalvarPermissoesAsync(IReadOnlyList<PermissaoPapelDto> permissoes, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            await GravarAsync("permissoes.json", permissoes, ct);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<ChamadoDto> CriarChamadoAsync(CriarChamadoRequest request, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var chamados = (await LerAsync<ChamadoDto[]>("chamados.json", [], ct)).ToList();
            var agora = DateTime.UtcNow;
            var protocolo = $"SESI-{agora:yyyyMMdd}-{chamados.Count(c => c.CriadoEm.Date == agora.Date) + 1:0000}";
            var chamado = new ChamadoDto(
                Guid.NewGuid().ToString("N"),
                protocolo,
                request.Nome.Trim(),
                request.Email.Trim().ToLowerInvariant(),
                request.Categoria.Trim(),
                request.Descricao.Trim(),
                request.Pagina.Trim(),
                "Aberto",
                null,
                agora,
                null,
                request.CapturaTela,
                request.CursoSlug?.Trim(),
                request.UsuarioId?.Trim());
            chamados.Add(chamado);
            await GravarAsync("chamados.json", chamados, ct);
            return chamado;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<IReadOnlyList<ChamadoDto>> ListarChamadosAsync(string? email, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var chamados = await LerAsync<ChamadoDto[]>("chamados.json", [], ct);
            return chamados
                .Where(c => string.IsNullOrWhiteSpace(email) || c.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(c => c.CriadoEm)
                .ToArray();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<ChamadoDto?> AtualizarChamadoAsync(
        string id,
        AtualizarChamadoRequest request,
        CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var chamados = (await LerAsync<ChamadoDto[]>("chamados.json", [], ct)).ToList();
            var indice = chamados.FindIndex(c => c.Id == id);
            if (indice < 0) return null;
            var atual = chamados[indice];
            var atualizado = atual with
            {
                Status = request.Status,
                Resposta = request.Resposta?.Trim(),
                AtualizadoEm = DateTime.UtcNow
            };
            chamados[indice] = atualizado;
            await GravarAsync("chamados.json", chamados, ct);
            return atualizado;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<MarcoCursoDto> RegistrarMarcoCursoAsync(
        AtualizarMarcoCursoRequest request,
        CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var marcos = (await LerAsync<MarcoCursoDto[]>("marcos.json", [], ct)).ToList();
            var indice = marcos.FindIndex(m =>
                m.CursoSlug.Equals(request.CursoSlug, StringComparison.OrdinalIgnoreCase) &&
                m.UsuarioId.Equals(request.UsuarioId, StringComparison.OrdinalIgnoreCase));
            var atual = indice >= 0
                ? marcos[indice]
                : new MarcoCursoDto(request.CursoSlug, request.UsuarioId, null, null);
            var agora = DateTime.UtcNow;
            var atualizado = request.Marco == "inicio"
                ? atual with { IniciadoEm = atual.IniciadoEm ?? agora }
                : atual with { ConcluidoEm = atual.ConcluidoEm ?? agora };
            if (indice < 0) marcos.Add(atualizado);
            else marcos[indice] = atualizado;
            await GravarAsync("marcos.json", marcos, ct);
            return atualizado;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<IReadOnlyList<MarcoCursoDto>> ObterMarcosCursoAsync(string usuarioId, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var marcos = await LerAsync<MarcoCursoDto[]>("marcos.json", [], ct);
            return marcos.Where(m => m.UsuarioId.Equals(usuarioId, StringComparison.OrdinalIgnoreCase)).ToArray();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private async Task<T> LerAsync<T>(string nome, T padrao, CancellationToken ct)
    {
        var caminho = Path.Combine(_raiz, nome);
        if (!File.Exists(caminho)) return padrao;
        await using var stream = File.OpenRead(caminho);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, ct) ?? padrao;
    }

    private async Task<IReadOnlyList<UsuarioGestaoDto>> CarregarUsuariosAsync(CancellationToken ct)
    {
        var usuarios = await LerAsync<UsuarioGestaoDto[]>("usuarios.json", [], ct);
        if (usuarios.Length > 0) return usuarios;

        var admin = new UsuarioGestaoDto(
            Guid.NewGuid().ToString("N"),
            "Administrador SESI",
            "admin@sesindustria.com.br",
            "Administrador",
            true,
            DateTime.UtcNow);
        await GravarAsync("usuarios.json", new[] { admin }, ct);
        return [admin];
    }

    private async Task GravarAsync<T>(string nome, T valor, CancellationToken ct)
    {
        var destino = Path.Combine(_raiz, nome);
        var temporario = $"{destino}.{Guid.NewGuid():N}.tmp";
        await using (var stream = File.Create(temporario))
        {
            await JsonSerializer.SerializeAsync(stream, valor, JsonOptions, ct);
        }
        File.Move(temporario, destino, true);
    }

    private sealed record CredencialUsuario(string UsuarioId, string PasswordHash);
}
